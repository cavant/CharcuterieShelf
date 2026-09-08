import { ServerAddressResolver } from '@/utils/serverAddressResolver'

export default ({ app, store, $db }, inject) => {
  const resolver = new ServerAddressResolver(store, $db || app.$db)
  inject('serverAddressResolver', resolver)
}
