/**
 * Square Online My offers UI — shares localStorage with jerseydeals.online.
 * Loaded by the Square storefront snippet to stay under Square's size cap.
 */
(function () {
  var OFFERS_KEY = 'jerseydeals.offers.v1'
  var OFFER_KEY = 'jerseydeals.offer.v1'
  var EMAIL_KEY = 'jerseydeals.buyerEmail.v1'
  var REWARDS_KEY = 'jerseydeals.rewardsMember.v1'
  var PURCHASED_KEY = 'jerseydeals.purchased.v1'
  var DEFS = {
    first10: { title: '10% off your first order', hint: 'Activate at checkout' },
    pl5: { title: '$5 off a Premier League jersey', hint: 'Activate at checkout' },
  }

  function get(k) {
    try {
      return localStorage.getItem(k) || ''
    } catch (e) {
      return ''
    }
  }
  function set(k, v) {
    try {
      localStorage.setItem(k, v)
    } catch (e) {}
  }
  function readWallet() {
    try {
      var o = JSON.parse(get(OFFERS_KEY) || 'null')
      if (!o || !Array.isArray(o.offers)) return { offers: [], activeId: null }
      return {
        offers: o.offers,
        activeId: o.activeId === 'first10' || o.activeId === 'pl5' ? o.activeId : null,
      }
    } catch (e) {
      return { offers: [], activeId: null }
    }
  }
  function writeWallet(w) {
    set(OFFERS_KEY, JSON.stringify(w))
  }
  function readOffer() {
    try {
      var o = JSON.parse(get(OFFER_KEY) || 'null') || {}
      return {
        activated: !!o.activated,
        email: (o.email || get(EMAIL_KEY) || '').toLowerCase(),
        claimed: !!o.claimed || !!o.activated,
      }
    } catch (e) {
      return { activated: false, email: get(EMAIL_KEY), claimed: false }
    }
  }
  function writeOffer(o) {
    set(
      OFFER_KEY,
      JSON.stringify({
        activated: !!o.activated,
        email: (o.email || '').toLowerCase(),
        claimed: !!o.claimed,
        activatedAt: o.activatedAt,
      }),
    )
    if (o.email) set(EMAIL_KEY, o.email)
  }
  function rewardsMember() {
    try {
      var o = JSON.parse(get(REWARDS_KEY) || 'null')
      return o && (o.email || o.phone) ? o : null
    } catch (e) {
      return null
    }
  }
  function openList() {
    return readWallet().offers.filter(function (x) {
      return x && x.status !== 'used'
    })
  }
  function claim(id) {
    var w = readWallet()
    if (
      w.offers.some(function (x) {
        return x.id === id
      })
    )
      return
    w.offers.push({ id: id, status: 'available', claimedAt: new Date().toISOString() })
    writeWallet(w)
  }
  function ensurePl5() {
    if (rewardsMember()) claim('pl5')
  }
  function cartLooksEmpty() {
    var path = location.pathname || ''
    if (/\/s\/cart/i.test(path)) {
      var t = (document.body && document.body.innerText) || ''
      if (/cart is empty|no items in your cart|your bag is empty/i.test(t)) return true
      if (
        document.querySelector(
          '[class*="cart"] img, [data-aid*="CART"] img, .cart-item, [class*="CartItem"]',
        )
      )
        return false
      return !/subtotal|checkout/i.test(t)
    }
    return !/\/product\//i.test(path)
  }
  function clearActive() {
    var w = readWallet()
    w.offers.forEach(function (o) {
      if (o.status === 'activated') {
        o.status = 'available'
        delete o.activatedAt
      }
    })
    w.activeId = null
    writeWallet(w)
    var email = get(EMAIL_KEY) || readOffer().email || ''
    writeOffer({ activated: false, email: email, claimed: !!readOffer().claimed || !!email })
  }
  function activate(id) {
    if (cartLooksEmpty()) return 'Add something to your cart to activate an offer.'
    if (id === 'first10' && get(PURCHASED_KEY) === '1')
      return 'First-order offer is only for new buyers.'
    var w = readWallet()
    var row = null
    for (var i = 0; i < w.offers.length; i++) {
      if (w.offers[i].id === id && w.offers[i].status !== 'used') row = w.offers[i]
    }
    if (!row) return 'That offer isn’t available.'
    w.offers.forEach(function (o) {
      if (o.status === 'activated') {
        o.status = 'available'
        delete o.activatedAt
      }
    })
    row.status = 'activated'
    row.activatedAt = new Date().toISOString()
    w.activeId = id
    writeWallet(w)
    var email = get(EMAIL_KEY) || readOffer().email || ''
    writeOffer({
      activated: id === 'first10',
      email: email,
      claimed: true,
      activatedAt: id === 'first10' ? Date.now() : undefined,
    })
    return ''
  }

  function ensureStyle() {
    if (document.getElementById('jd-offers-css')) return
    var style = document.createElement('style')
    style.id = 'jd-offers-css'
    style.textContent =
      '#jd-offers-screen{position:fixed;inset:0;z-index:99998;background:#f3f5f7;color:#0b223f;display:flex;flex-direction:column}' +
      '#jd-offers-screen .jd-offers-panel{display:flex;flex-direction:column;height:100%}' +
      '#jd-offers-screen header{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.1rem;border-bottom:1px solid rgba(11,34,63,.12);background:#fcf5e9}' +
      '#jd-offers-screen header p{margin:0;font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:.75rem}' +
      '#jd-offers-screen #jd-offers-back{border:0;background:transparent;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:.7rem;cursor:pointer;color:#0b223f}' +
      '#jd-offers-body,#jd-cart-offers{padding:1rem;display:flex;flex-direction:column;gap:.65rem}' +
      '#jd-cart-offers{margin:1rem auto;max-width:28rem;width:calc(100% - 2rem);background:#fcf5e9;border:1px solid rgba(11,34,63,.12)}' +
      '.jd-offers-title{margin:0;font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:.72rem;color:#0b223f}' +
      '.jd-offers-empty,.jd-offers-msg{margin:0;font-size:.78rem;color:#d7282f}' +
      '.jd-offer-row{display:flex;justify-content:space-between;gap:.75rem;align-items:center;padding:.7rem .75rem;border:1px solid rgba(11,34,63,.12);background:#fff}' +
      '.jd-offer-row-title{margin:0;font-size:.9rem;font-weight:700;color:#0b223f}' +
      '.jd-offer-row-hint{margin:.2rem 0 0;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:#64748b}' +
      '.jd-offer-row button{flex:0 0 auto;border:0;background:#d7282f;color:#fff;font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:.55rem .7rem;cursor:pointer}' +
      '.jd-offer-row button:disabled{background:#0b223f;opacity:.85}'
    document.head.appendChild(style)
  }

  function renderList(host, onActivated) {
    ensureStyle()
    ensurePl5()
    if (cartLooksEmpty()) clearActive()
    var list = openList()
    var active = readWallet().activeId
    host.innerHTML = ''
    var title = document.createElement('p')
    title.className = 'jd-offers-title'
    title.textContent = 'My offers'
    host.appendChild(title)
    if (!list.length) {
      var empty = document.createElement('p')
      empty.className = 'jd-offers-empty'
      empty.textContent = 'No offers yet. Claim the welcome offer or join Rewards Club.'
      host.appendChild(empty)
      return
    }
    var msg = document.createElement('p')
    msg.className = 'jd-offers-msg'
    list.forEach(function (offer) {
      var def = DEFS[offer.id] || { title: offer.id, hint: 'Activate at checkout' }
      var row = document.createElement('div')
      row.className = 'jd-offer-row'
      var copy = document.createElement('div')
      var h = document.createElement('p')
      h.className = 'jd-offer-row-title'
      h.textContent = def.title
      var s = document.createElement('p')
      s.className = 'jd-offer-row-hint'
      s.textContent = active === offer.id ? 'Active on this checkout' : def.hint
      copy.appendChild(h)
      copy.appendChild(s)
      var btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = active === offer.id ? 'Activated' : 'Activate'
      btn.disabled = active === offer.id
      btn.onclick = function () {
        var err = activate(offer.id)
        msg.textContent = err || ''
        if (!err && onActivated) onActivated(offer.id)
        renderList(host, onActivated)
      }
      row.appendChild(copy)
      row.appendChild(btn)
      host.appendChild(row)
    })
    host.appendChild(msg)
  }

  function openOffers() {
    ensureStyle()
    var existing = document.getElementById('jd-offers-screen')
    if (existing) existing.remove()
    var root = document.createElement('div')
    root.id = 'jd-offers-screen'
    root.innerHTML =
      '<div class="jd-offers-panel"><header><p>My offers</p><button type="button" id="jd-offers-back">Back</button></header><div id="jd-offers-body"></div></div>'
    document.body.appendChild(root)
    root.querySelector('#jd-offers-back').onclick = function () {
      root.remove()
    }
    renderList(root.querySelector('#jd-offers-body'), function () {
      try {
        window.dispatchEvent(new Event('jd-offers-activated'))
      } catch (e) {}
    })
  }

  function ensureCartOffers() {
    if (!/\/s\/cart/i.test(location.pathname || '')) return
    ensureStyle()
    ensurePl5()
    if (cartLooksEmpty()) clearActive()
    var host = document.getElementById('jd-cart-offers')
    if (!host) {
      host = document.createElement('div')
      host.id = 'jd-cart-offers'
      var mount = document.querySelector('main, [class*="cart"], .user-content, body')
      if (mount) mount.insertBefore(host, mount.firstChild)
      else document.body.appendChild(host)
    }
    renderList(host, function () {
      try {
        window.dispatchEvent(new Event('jd-offers-activated'))
      } catch (e) {}
    })
  }

  window.jdOpenOffers = openOffers
  window.jdEnsureCartOffers = ensureCartOffers
  ensureCartOffers()
  setInterval(ensureCartOffers, 2000)
})()
