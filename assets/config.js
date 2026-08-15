/* Supabase 连接信息。
 *
 * 这两个值可以公开提交 —— publishable key 本来就是给浏览器用的，
 * 真正的权限由数据库的 RLS 策略把关：
 *   · 任何人都能「读」照片
 *   · 只有登录过的人（你）能上传／删除
 * 千万不要把 service_role key 放进这里。
 */
window.TRIP_CONFIG = {
  url: 'https://zrjbguzyovilwrceuulm.supabase.co',
  anonKey: 'sb_publishable_qyF_mNrlQHj8tFvzFZHT1A_CHE1m0wp',
  bucket: 'spot-photos',
  table: 'spot_photos'
};
