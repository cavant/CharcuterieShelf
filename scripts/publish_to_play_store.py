#!/usr/bin/env python3
"""
CharcuterieShelf - Google Play Developer API Automated Publisher
Uploads Android App Bundle (.aab) to Google Play Console release tracks (internal, alpha/closed, production).

Prerequisites:
  1. pip install google-api-python-client google-auth
  2. Google Cloud Service Account JSON key saved as 'android/play-service-account.json'
     (granted Release Management permissions in Google Play Console -> API Access)
  3. The first .aab release must have been uploaded manually once in Google Play Console.
"""

import argparse
import os
import sys
import json

PACKAGE_NAME = 'com.CharcuterieShelf'
DEFAULT_AAB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab'
)
SERVICE_ACCOUNT_SEARCH_PATHS = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'android', 'play-service-account.json'),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'play-service-account.json'),
    os.path.join(os.getcwd(), 'play-service-account.json'),
    os.path.join(os.getcwd(), 'android', 'play-service-account.json'),
]

def find_service_account_file():
    for path in SERVICE_ACCOUNT_SEARCH_PATHS:
        if os.path.isfile(path):
            return path
    return None

def check_dependencies():
    missing = []
    try:
        import googleapiclient.discovery
        from googleapiclient.http import MediaFileUpload
    except ImportError:
        missing.append('google-api-python-client')
    try:
        from google.oauth2 import service_account
    except ImportError:
        missing.append('google-auth')

    if missing:
        print(f"[ERROR] Missing required Python libraries: {', '.join(missing)}")
        print("Please install them by running:")
        print(f"  pip install {' '.join(missing)}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Publish CharcuterieShelf to Google Play Console')
    parser.add_argument(
        '--track',
        default='alpha',
        choices=['internal', 'alpha', 'beta', 'production'],
        help='Release track: "internal" (Internal Testing), "alpha" (Closed Testing), "beta" (Open Testing), "production"'
    )
    parser.add_argument(
        '--aab',
        default=DEFAULT_AAB_PATH,
        help='Path to release .aab file'
    )
    parser.add_argument(
        '--key',
        default=None,
        help='Path to Google Cloud service account JSON key'
    )
    parser.add_argument(
        '--notes',
        default=None,
        help='Release notes text for this release (en-US)'
    )
    args = parser.parse_args()

    # 1. Check dependencies
    check_dependencies()
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2 import service_account

    # 2. Locate service account key
    key_file = args.key or find_service_account_file()
    if not key_file:
        print("[ERROR] Google Play Service Account JSON key not found!")
        print("\nTo enable automated publishing:")
        print("1. Go to Google Play Console -> API Access (or Developer account -> API access).")
        print("2. Link a Google Cloud Project and create a Service Account.")
        print("3. In Google Cloud Console, generate a new JSON Key for the service account.")
        print("4. Save the downloaded JSON file to:")
        print(f"   {SERVICE_ACCOUNT_SEARCH_PATHS[0]}")
        print("5. In Play Console -> Users & permissions, ensure the service account has release permissions.")
        sys.exit(1)

    # 3. Check AAB file exists
    if not os.path.isfile(args.aab):
        print(f"[ERROR] AAB bundle not found at: {args.aab}")
        print("Please build the release bundle first:")
        print("  cd android; .\\gradlew.bat bundleRelease")
        sys.exit(1)

    print(f"Service Account: {key_file}")
    print(f"Target Package:  {PACKAGE_NAME}")
    print(f"Target Track:    {args.track}")
    print(f"AAB Path:        {args.aab} ({os.path.getsize(args.aab) / (1024*1024):.2f} MB)")

    # 4. Authenticate with Google Play Developer API
    scopes = ['https://www.googleapis.com/auth/androidpublisher']
    credentials = service_account.Credentials.from_service_account_file(key_file, scopes=scopes)
    service = build('androidpublisher', 'v3', credentials=credentials)

    # 5. Create a new edit
    print("\n[1/4] Creating new edit session...")
    edit_request = service.edits().insert(body={}, packageName=PACKAGE_NAME)
    edit = edit_request.execute()
    edit_id = edit['id']
    print(f"      Edit ID: {edit_id}")

    try:
        # 6. Upload the AAB bundle
        print("\n[2/4] Uploading Android App Bundle (.aab)...")
        media = MediaFileUpload(args.aab, mimetype='application/octet-stream', resumable=True)
        bundle_upload_request = service.edits().bundles().upload(
            packageName=PACKAGE_NAME,
            editId=edit_id,
            media_body=media
        )
        bundle = bundle_upload_request.execute()
        version_code = bundle['versionCode']
        print(f"      Uploaded versionCode: {version_code}")

        # 7. Assign to track
        print(f"\n[3/4] Assigning version {version_code} to track '{args.track}'...")
        release_data = {
            'versionCodes': [str(version_code)],
            'status': 'completed'
        }
        if args.notes:
            release_data['releaseNotes'] = [{
                'language': 'en-US',
                'text': args.notes
            }]

        track_request = service.edits().tracks().update(
            packageName=PACKAGE_NAME,
            editId=edit_id,
            track=args.track,
            body={
                'track': args.track,
                'releases': [release_data]
            }
        )
        track_request.execute()
        print(f"      Track '{args.track}' updated successfully.")

        # 8. Commit the edit
        print("\n[4/4] Committing edit session to Google Play...")
        commit_request = service.edits().commit(packageName=PACKAGE_NAME, editId=edit_id)
        commit_request.execute()
        print(f"\n🎉 SUCCESS! CharcuterieShelf (versionCode {version_code}) has been published to the '{args.track}' track on Google Play!")

    except Exception as e:
        print(f"\n[ERROR] Failed to publish to Google Play: {e}")
        print("\nNote: If this is the very first release of the app, Google Play requires")
        print("uploading the first .aab manually via the Play Console web UI before")
        print("the Developer API is allowed to create releases.")
        sys.exit(1)

if __name__ == '__main__':
    main()
