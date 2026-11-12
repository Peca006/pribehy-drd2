// Příjem sdíleného kódu (Sdílet → Příběhy v Dračím doupěti): service worker zachytí POST z cíle sdílení,
// uloží text kódu do cache a přesměruje na Import, který ho načte (src/core/sharedInbox.ts).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || !url.pathname.endsWith('/share-target')) return
  event.respondWith(
    (async () => {
      let text = ''
      try {
        const form = await event.request.formData()
        const file = form.get('file')
        if (file && typeof file !== 'string') text = await file.text()
        else text = String(form.get('text') ?? '')
        if (!text.trim()) text = String(form.get('text') ?? '')
      } catch {
        /* prázdné sdílení */
      }
      const cache = await caches.open('drd2-shared')
      await cache.put('shared', new Response(text))
      return Response.redirect(new URL('./#/postavy/import/sdileno', url.href).href, 303)
    })(),
  )
})
