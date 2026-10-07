const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

const paths = {
  // product categories
  shirt: <><path {...S} d="M8 3.5 4 5.5v4h2.5V20.5h11V9.5H20v-4l-4-2" /><path {...S} d="M9.5 3.5a2.5 2.5 0 0 0 5 0" /></>,
  bag: <><path {...S} d="M4.5 8h15l-1.2 12.5H5.7z" /><path {...S} d="M8.8 8V6.2a3.2 3.2 0 0 1 6.4 0V8" /></>,
  bottle: <><path {...S} d="M10 2.8h4v2.4l1.6 2.2V21H8.4V7.4L10 5.2z" /><path {...S} d="M8.4 11.5h7.2" /></>,
  gift: <><path {...S} d="M3.6 8.4h16.8v3.4H3.6z" /><path {...S} d="M5.2 11.8h13.6v8.6H5.2z" /><path {...S} d="M12 8.4v12" /><path {...S} d="M12 8.4S10.8 4 8.6 4a2.1 2.1 0 0 0 0 4.4M12 8.4S13.2 4 15.4 4a2.1 2.1 0 0 1 0 4.4" /></>,
  notebook: <><path {...S} d="M6.5 3.2h12v17.6h-12z" /><path {...S} d="M9.5 3.2v17.6" /><path {...S} d="M12.2 8h3.6M12.2 11.4h3.6" /></>,
  lanyard: <><path {...S} d="M9 3.2 12 9.5 15 3.2" /><path {...S} d="M7.6 9.5h8.8v11.3H7.6z" /><path {...S} d="M10 13.5h4" /></>,
  // product types
  tote: <><path {...S} d="M4.8 8h14.4l-1 12.6H5.8z" /><path {...S} d="M8.6 8V6.4a3.4 3.4 0 0 1 6.8 0V8" /></>,
  drawstring: <><path {...S} d="M6.2 9.4h11.6l1.4 6.2a4.6 4.6 0 0 1-4.5 5.6H9.3a4.6 4.6 0 0 1-4.5-5.6z" /><path {...S} d="M8.4 9.4V6.6a3.6 3.6 0 0 1 7.2 0v2.8" /><path {...S} d="M7.2 12.4h9.6" /></>,
  backpack: <><path {...S} d="M5.4 8.6a4 4 0 0 1 4-4h5.2a4 4 0 0 1 4 4v11.8H5.4z" /><path {...S} d="M9.4 4.6V3.4h5.2v1.2" /><path {...S} d="M9 13.2h6v4.4H9z" /><path {...S} d="M10.8 15.4h2.4" /></>,
  pouch: <><rect {...S} x="3.2" y="7.2" width="17.6" height="9.6" rx="2.4" /><path {...S} d="M3.2 10.4h17.6" /><path {...S} d="M13.6 12.6h2.6" /></>,
  laptopBag: <><rect {...S} x="3" y="8" width="18" height="11" rx="2.2" /><path {...S} d="M8.6 8V6.4a2 2 0 0 1 2-2h2.8a2 2 0 0 1 2 2V8" /><path {...S} d="M3 12.8h18" /><path {...S} d="M10.4 12.8h3.2" /></>,
  coolerBag: <><rect {...S} x="3.6" y="8.4" width="16.8" height="11.4" rx="2.2" /><path {...S} d="M3.6 12.4h16.8" /><path {...S} d="M8.6 8.4V6.2h6.8v2.2" /><path {...S} d="M10.6 15.4h2.8" /></>,
  book: <><path {...S} d="M12 6.4S10 4.4 4.2 4.4v13.2C10 17.6 12 19.6 12 19.6" /><path {...S} d="M12 6.4s2-2 7.8-2v13.2c-5.8 0-7.8 2-7.8 2" /><path {...S} d="M12 6.4v13.2" /></>,
  pen: <><path {...S} d="m15.6 3.8 4.6 4.6L9.4 19.2l-5.6 1.4 1.4-5.6z" /><path {...S} d="m13.4 6 4.6 4.6" /><path {...S} d="m5.2 15 3.6 3.6" /></>,
  stickyNote: <><path {...S} d="M4.2 4.2h15.6v10.2l-5.4 5.4H4.2z" /><path {...S} d="M19.8 14.4h-5.4v5.4" /><path {...S} d="M7.6 8.4h8M7.6 11.6h5" /></>,
  folder: <><path {...S} d="M3.4 6.4a1.6 1.6 0 0 1 1.6-1.6h4l2.2 2.6h8a1.6 1.6 0 0 1 1.6 1.6v9.4a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6z" /></>,
  paperclip: <path {...S} d="M17.6 11.2 10 18.8a4.2 4.2 0 0 1-6-6l8.4-8.4a2.8 2.8 0 0 1 4 4l-8.4 8.4a1.4 1.4 0 0 1-2-2l7.6-7.6" />,
  headphones: <><path {...S} d="M4.4 14v-1.8a7.6 7.6 0 0 1 15.2 0V14" /><path {...S} d="M4.4 13.4h2.8v5.8H5.8a1.4 1.4 0 0 1-1.4-1.4z" /><path {...S} d="M19.6 13.4h-2.8v5.8h1.4a1.4 1.4 0 0 0 1.4-1.4z" /></>,
  deskLamp: <><path {...S} d="M6 20.6h8" /><path {...S} d="M10 20.6V11" /><path {...S} d="m10 11 4.4-6.4 4.6 3.2L14.8 14z" /><path {...S} d="M12.2 7.8 17 11" /></>,
  leaf: <><path {...S} d="M20 4.4c0 8.6-4.6 13-10 13a5.2 5.2 0 0 1-5.2-5.2C4.8 7.6 10.4 4.4 20 4.4z" /><path {...S} d="M4.4 20.6C6.8 14.4 11.4 10 17 8" /></>,
  eco: <><circle {...S} cx="12" cy="12" r="8.6" /><path {...S} d="M16.6 8.2c0 5-2.8 7.6-6 7.6a3 3 0 0 1-3-3c0-2.6 3.2-4.6 9-4.6z" /><path {...S} d="M7.6 16.8c1.4-3.4 4-6 7.2-7.2" /></>,
  tumbler: <><path {...S} d="M7.4 5.2h9.2l-1.2 15H8.6z" /><path {...S} d="M7.6 9h8.8" /></>,
  mug: <><path {...S} d="M4.2 6.4h11.6v9.4a4 4 0 0 1-4 4H8.2a4 4 0 0 1-4-4z" /><path {...S} d="M15.8 8.6h1.8a2.8 2.8 0 0 1 0 5.6h-1.8" /></>,
  travelCup: <><path {...S} d="M6.6 8.2h10.8l-1.2 11.2a1.6 1.6 0 0 1-1.6 1.4H9.4a1.6 1.6 0 0 1-1.6-1.4z" /><path {...S} d="M5.6 5h12.8v3.2H5.6z" /><path {...S} d="M7.8 12.8h8.4" /></>,
  glassware: <><path {...S} d="M6.6 3.6h10.8l-1.2 5.2a4.4 4.4 0 0 1-8.4 0z" /><path {...S} d="M12 13.2v7.2M8.6 20.4h6.8" /></>,
  flask: <><path {...S} d="M8.2 6.6h7.6v12.2a1.8 1.8 0 0 1-1.8 1.8h-4a1.8 1.8 0 0 1-1.8-1.8z" /><path {...S} d="M9.8 3.4h4.4v3.2H9.8z" /><path {...S} d="M8.2 11h7.6" /></>,
  // keychains, pins and awards
  keychain: <><circle {...S} cx="8" cy="8" r="3.8" /><path {...S} d="m10.7 10.7 8.4 8.4" /><path {...S} d="m15.4 15.4 2 2" /><path {...S} d="m17.6 13.2 2 2" /></>,
  pin: <><circle {...S} cx="12" cy="9.2" r="5.6" /><path {...S} d="M12 14.8v5.8" /><path {...S} d="M9.4 20.6h5.2" /></>,
  trophy: <><path {...S} d="M7.8 3.6h8.4v5.6a4.2 4.2 0 0 1-8.4 0z" /><path {...S} d="M7.8 5.2H5a2.6 2.6 0 0 0 2.8 4.2" /><path {...S} d="M16.2 5.2H19a2.6 2.6 0 0 1-2.8 4.2" /><path {...S} d="M12 13.4v3.4" /><path {...S} d="M8.6 20.4h6.8v-3.6H8.6z" /></>,
  plaque: <><rect {...S} x="5.6" y="3.4" width="12.8" height="13.4" rx="1.8" /><path {...S} d="M8.4 7.8h7.2M8.4 11.2h4.8" /><path {...S} d="M8.2 16.8v2.2h7.6v-2.2" /><path {...S} d="M5.6 20.6h12.8" /></>,
  crystal: <><path {...S} d="M12 3.2 17.2 9v11.4H6.8V9z" /><path {...S} d="M6.8 9h10.4" /><path {...S} d="M12 3.2V9" /></>,
  // bottle caps
  screwCap: <><path {...S} d="M7.4 10.2a4.6 4.6 0 0 1 9.2 0v1.6H7.4z" /><path {...S} d="M8.6 11.8h6.8v6.6a1.8 1.8 0 0 1-1.8 1.8h-3.2a1.8 1.8 0 0 1-1.8-1.8z" /><path {...S} d="M8.6 14.6h6.8M8.6 17h6.8" /></>,
  strawLid: <><path {...S} d="M6.6 10.6h10.8v2.6a2 2 0 0 1-2 2H8.6a2 2 0 0 1-2-2z" /><path {...S} d="M8.8 15.2h6.4v3.4a1.8 1.8 0 0 1-1.8 1.8h-2.8a1.8 1.8 0 0 1-1.8-1.8z" /><path {...S} d="m13.2 10.6 2.6-7.2" /></>,
  handleCap: <><path {...S} d="M8.8 3.6h6.4a2 2 0 0 1 0 4H8.8a2 2 0 0 1 0-4z" /><path {...S} d="M7.6 11.4h8.8v6.8a2 2 0 0 1-2 2h-4.8a2 2 0 0 1-2-2z" /><path {...S} d="M9.4 11.4V9a2.6 2.6 0 0 1 5.2 0v2.4" /></>,
  badge: <><rect {...S} x="5.6" y="7.6" width="12.8" height="13" rx="1.8" /><path {...S} d="M10 7.6V4.4h4v3.2" /><circle {...S} cx="12" cy="12.6" r="1.8" /><path {...S} d="M9 17.6c0-1.6 1.4-2.6 3-2.6s3 1 3 2.6" /></>,
  wristband: <><ellipse {...S} cx="12" cy="12" rx="8.6" ry="5.6" /><ellipse {...S} cx="12" cy="12" rx="4.6" ry="2.8" /></>,
  signage: <><path {...S} d="M4.4 4.4h15.2v10.2H4.4z" /><path {...S} d="M12 14.6v6M8.4 20.6h7.2" /><path {...S} d="M7.6 8h8.8M7.6 11h5.6" /></>,
  welcomePack: <><path {...S} d="M3.4 7.6 12 4l8.6 3.6v9L12 20.2 3.4 16.6z" /><path {...S} d="m3.4 7.6 8.6 3.6 8.6-3.6M12 11.2v9" /><path {...S} d="M7.7 5.8 16.3 9.4" /></>,
  starOutline: <path {...S} d="m12 3.2 2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.76l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z" />,
  // industries
  school: <><path {...S} d="M12 3.6 21 8l-9 4.4L3 8z" /><path {...S} d="M6.8 10.3v5.1c0 1.7 2.3 3 5.2 3s5.2-1.3 5.2-3v-5.1" /><path {...S} d="M21 8v5" /></>,
  business: <><path {...S} d="M3.6 20.6h16.8" /><path {...S} d="M5.4 20.6V5.2h8.4v15.4" /><path {...S} d="M13.8 9.6h4.8v11" /><path {...S} d="M8 8.6h3M8 12h3M8 15.4h3" /></>,
  events: <><path {...S} d="M3.4 6.8h17.2v13.8H3.4z" /><path {...S} d="M3.4 11h17.2" /><path {...S} d="M8 3.6v4M16 3.6v4" /></>,
  church: <><path {...S} d="M12 2.6v5M10 4.6h4" /><path {...S} d="M12 7.6 5 12v8.6h14V12z" /><path {...S} d="M10.4 20.6v-4.4h3.2v4.4" /></>,
  sports: <><circle {...S} cx="12" cy="12" r="8.6" /><path {...S} d="M12 3.4 8.6 8.2l1.4 4.6h4l1.4-4.6zM3.7 10.2l4.9-2M20.3 10.2l-4.9-2M6.6 19.6l3.4-6.8M17.4 19.6 14 12.8" /></>,
  community: <><circle {...S} cx="8.6" cy="8.6" r="3" /><circle {...S} cx="16.4" cy="10.2" r="2.4" /><path {...S} d="M2.8 19.8c0-3.2 2.6-5.2 5.8-5.2s5.8 2 5.8 5.2" /><path {...S} d="M16.2 14.8c2.7.2 5 1.9 5 5" /></>,
  // benefits
  supplier: <><circle {...S} cx="12" cy="12" r="2.6" /><circle {...S} cx="12" cy="4.4" r="2" /><circle {...S} cx="4.8" cy="17.6" r="2" /><circle {...S} cx="19.2" cy="17.6" r="2" /><path {...S} d="M12 6.4v3M10 13.8l-3.6 2.4M14 13.8l3.6 2.4" /></>,
  value: <><path {...S} d="M12 3.2 3.6 6.6v5.7c0 4.4 3.5 7.4 8.4 8.5 4.9-1.1 8.4-4.1 8.4-8.5V6.6z" /><path {...S} d="m8.9 12.1 2.2 2.3 4-4.6" /></>,
  flexible: <><path {...S} d="M4 8.5h6.5M4 12h10M4 15.5h6.5" /><path {...S} d="m17.5 8.5 3 3.5-3 3.5" /></>,
  expert: <><path {...S} d="M12 3.4a5.6 5.6 0 0 0-3.2 10.2v2.2h6.4v-2.2A5.6 5.6 0 0 0 12 3.4z" /><path {...S} d="M9.6 18.4h4.8M10.4 20.8h3.2" /></>,
  tailored: <><circle {...S} cx="12" cy="12" r="8.4" /><circle {...S} cx="12" cy="12" r="4.6" /><circle cx="12" cy="12" r="1.7" fill="currentColor" /></>,
  // printing methods
  layers: <><path {...S} d="m12 3.4 8.4 4.3-8.4 4.3-8.4-4.3z" /><path {...S} d="m4.4 12 7.6 3.9 7.6-3.9M4.4 16.2l7.6 3.9 7.6-3.9" /></>,
  transfer: <><path {...S} d="M4.2 15.6h15.6v4.8H4.2z" /><path {...S} d="M12 3.4v8.8" /><path {...S} d="m8.4 8.8 3.6 3.4 3.6-3.4" /></>,
  droplet: <path {...S} d="M12 3.2s5.6 5.6 5.6 9.4a5.6 5.6 0 0 1-11.2 0C6.4 8.8 12 3.2 12 3.2z" />,
  thread: <><path {...S} d="M6.4 3.6v9.8a5.6 5.6 0 0 0 11.2 0V3.6" /><path {...S} d="M12 8.4v12" /><circle {...S} cx="12" cy="21" r="1.2" /></>,
  spark: <><path {...S} d="M12 2.8 13.9 9l6.2 1.9-6.2 1.9L12 19l-1.9-6.2L3.9 10.9 10.1 9z" /><path {...S} d="m18.6 16.4.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7z" /></>,
  sun: <><circle {...S} cx="12" cy="12" r="4.2" /><path {...S} d="M12 2.6v2.4M12 19v2.4M4.4 12H2M22 12h-2.4M6.4 6.4 4.7 4.7M19.3 19.3l-1.7-1.7M17.6 6.4l1.7-1.7M4.7 19.3l1.7-1.7" /></>,
  // process
  consult: <><path {...S} d="M4 5.4h16v10.2H13l-4 3.6v-3.6H4z" /><path {...S} d="M8.4 10.4h7.2" /></>,
  design: <><path {...S} d="m14.8 4.4 4.8 4.8L9.4 19.4l-5.6.8.8-5.6z" /><path {...S} d="m12.6 6.6 4.8 4.8" /></>,
  palette: <><path {...S} d="M12 3.5c-4.9 0-8.5 3.6-8.5 8.2 0 4.5 3.7 8.8 8.1 8.8 1.4 0 2.1-.9 2.1-1.9 0-1.4-1.2-1.6-1.2-2.8 0-1 .8-1.7 1.9-1.7h2.2c2.3 0 3.9-1.7 3.9-4 0-3.6-3.8-6.6-8.5-6.6z" /><circle {...S} cx="7.9" cy="11.2" r="1.1" /><circle {...S} cx="10.6" cy="7.6" r="1.1" /><circle {...S} cx="15" cy="8.1" r="1.1" /></>,
  sample: <><path {...S} d="m12 3.2 8 4.2v9.2l-8 4.2-8-4.2V7.4z" /><path {...S} d="m4 7.4 8 4.2 8-4.2M12 11.6v8.2" /></>,
  production: <><circle {...S} cx="12" cy="12" r="3.2" /><path {...S} d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" /></>,
  delivery: <><path {...S} d="M2.8 6.4h10.6v10H2.8z" /><path {...S} d="M13.4 9.6h3.8l3 3.2v3.6h-6.8z" /><circle {...S} cx="7" cy="18.4" r="1.9" /><circle {...S} cx="17.2" cy="18.4" r="1.9" /></>,
  // misc
  quantity: <><circle {...S} cx="7" cy="7" r="2.6" /><circle {...S} cx="17" cy="7" r="2.6" /><circle {...S} cx="7" cy="17" r="2.6" /><circle {...S} cx="17" cy="17" r="2.6" /></>,
  calendar: <><path {...S} d="M3.6 6.4h16.8v14H3.6z" /><path {...S} d="M3.6 10.6h16.8M8 3.6v4M16 3.6v4" /></>,
  photos: <><path {...S} d="M3.6 5.6h16.8v12.8H3.6z" /><path {...S} d="m3.6 15.2 4.6-4.4 3.4 3.2 3.6-3.8 5.2 5" /><circle {...S} cx="8.6" cy="9.2" r="1.4" /></>,
  clipboard: <><path {...S} d="M8.4 4.4H6.2v16h11.6v-16h-2.2" /><path {...S} d="M9 2.8h6v3.2H9z" /><path {...S} d="M9.2 11h5.6M9.2 14.6h5.6" /></>,
  check: <path {...S} d="m4.8 12.5 4.6 4.6L19.2 7.3" />,
  checkCircle: <><circle {...S} cx="12" cy="12" r="8.6" /><path {...S} d="m8.2 12.3 2.6 2.6 5-5.4" /></>,
  // Why MySOS: reasons, steps and why clients return
  award: <><circle {...S} cx="12" cy="9" r="5.6" /><path {...S} d="m12 6.2.9 1.8 2 .3-1.45 1.4.34 2L12 10.75 10.2 11.7l.34-2L9.1 8.3l2-.3z" /><path {...S} d="m8.6 13.5-1.8 7.1 5.2-2.6 5.2 2.6-1.8-7.1" /></>,
  tag: <><path {...S} d="M3.6 12.2V4.4a.8.8 0 0 1 .8-.8h7.8l8.4 8.4-8.6 8.6z" /><circle {...S} cx="8.2" cy="8.2" r="1.5" /></>,
  search: <><circle {...S} cx="10.6" cy="10.6" r="6.2" /><path {...S} d="m15.2 15.2 5.2 5.2" /><path {...S} d="M8.4 10.6h4.4M10.6 8.4v4.4" /></>,
  contact: <><circle {...S} cx="10" cy="8.2" r="3.4" /><path {...S} d="M3.8 20.4c0-3.6 2.8-6.2 6.2-6.2s6.2 2.6 6.2 6.2" /><path {...S} d="M16.6 4.2a4.6 4.6 0 0 1 0 8M18.8 2.8a7.4 7.4 0 0 1 0 10.8" /></>,
  support: <><path {...S} d="M4.6 13.4v-2a7.4 7.4 0 0 1 14.8 0v2" /><path {...S} d="M4.6 12.8h2.6v5H5.8a1.2 1.2 0 0 1-1.2-1.2zM19.4 12.8h-2.6v5h1.4a1.2 1.2 0 0 0 1.2-1.2z" /><path {...S} d="M18.1 17.8c0 1.7-1.7 2.8-4.5 2.8h-1.2" /><circle cx="11.8" cy="20.6" r="1.1" fill="currentColor" /></>,
  mouse: <><rect {...S} x="7.4" y="3.2" width="9.2" height="15" rx="4.6" /><path {...S} d="M12 6.6v2.6" /></>,
  arrowRight: <path {...S} d="M4.5 12h15m-5.6-5.6L19.5 12l-5.6 5.6" />,
  chevronDown: <path {...S} d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  chevronUp: <path {...S} d="m6.5 14.5 5.5-5.5 5.5 5.5" />,
  // Solution pages: breadcrumb, request builder and use cases
  home: <><path {...S} d="M3.6 11 12 4l8.4 7" /><path {...S} d="M6 9.4v10.2h4.4v-5.2h3.2v5.2H18V9.4" /></>,
  upload: <><path {...S} d="M7.2 17.8H6a3.8 3.8 0 0 1-.6-7.6 5.6 5.6 0 0 1 10.9-1.4 4.4 4.4 0 0 1 1.3 8.6" /><path {...S} d="M12 20.4v-8.2M8.8 15 12 11.8l3.2 3.2" /></>,
  trash: <><path {...S} d="M4.4 6.6h15.2M9.6 6.6V4.2h4.8v2.4" /><path {...S} d="m6.2 6.6.9 13.2h9.8l.9-13.2M10 10.4v5.8M14 10.4v5.8" /></>,
  info: <><circle {...S} cx="12" cy="12" r="8.6" /><path {...S} d="M12 11v5.4" /><circle cx="12" cy="7.9" r="1.05" fill="currentColor" /></>,
  close: <path {...S} d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6" />,
  phone: <path {...S} d="M6.9 3.4h3.2l1.6 4-2 1.3a12 12 0 0 0 5.6 5.6l1.3-2 4 1.6v3.2a1.9 1.9 0 0 1-2.1 1.9C11.4 18.4 5.6 12.6 5 5.5a1.9 1.9 0 0 1 1.9-2.1z" />,
  mail: <><rect {...S} x="3" y="5.2" width="18" height="13.6" rx="2.6" /><path {...S} d="m3.9 7 8.1 5.8L20.1 7" /></>,
  tent: <><path {...S} d="M12 3.8 2.8 20.2h18.4z" /><path {...S} d="M12 3.8v16.4M9 20.2 12 14.4l3 5.8" /><path {...S} d="M10.6 3.8h2.8" /></>,
  chevronLeft: <path {...S} d="M14.5 5.5 8 12l6.5 6.5" />,
  chevronRight: <path {...S} d="M9.5 5.5 16 12l-6.5 6.5" />,
  plus: <path {...S} d="M12 5.5v13M5.5 12h13" />,
  minus: <path {...S} d="M5.5 12h13" />,
  whatsapp: <path fill="currentColor" d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2.1 22l5.36-1.4a9.8 9.8 0 0 0 4.58 1.16c5.43 0 9.84-4.4 9.84-9.84 0-2.63-1.02-5.1-2.88-6.96A9.77 9.77 0 0 0 12.04 2zm0 18a8.15 8.15 0 0 1-4.15-1.14l-.3-.18-3.08.8.83-3-.2-.31a8.13 8.13 0 0 1-1.25-4.33c0-4.51 3.67-8.18 8.18-8.18 2.18 0 4.24.85 5.78 2.4a8.13 8.13 0 0 1 2.39 5.79c0 4.51-3.67 8.15-8.2 8.15zm4.49-6.1c-.25-.13-1.46-.72-1.68-.8-.23-.09-.39-.13-.56.12s-.64.8-.78.97c-.15.16-.29.18-.53.06-.25-.13-1.04-.39-1.98-1.22-.73-.65-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.74 2.65 4.2 3.72.59.25 1.05.4 1.4.52.59.18 1.13.16 1.55.1.48-.07 1.46-.6 1.66-1.17.21-.58.21-1.07.15-1.17-.06-.11-.22-.17-.47-.29z" />,
  star: <path fill="currentColor" d="m12 2.6 2.9 5.88 6.5.95-4.7 4.58 1.1 6.47L12 17.42l-5.8 3.06 1.1-6.47-4.7-4.58 6.5-.95z" />,
  facebook: <path fill="currentColor" d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z" />,
  instagram: <><rect {...S} x="3.2" y="3.2" width="17.6" height="17.6" rx="5" /><circle {...S} cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="1.2" fill="currentColor" /></>,
  linkedin: <><rect {...S} x="3" y="3" width="18" height="18" rx="2.4" /><path fill="currentColor" d="M7.6 10.2h1.9v7H7.6zM8.55 6.7a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3zM11.3 10.2h1.82v.96h.03c.25-.47.87-.97 1.8-.97 1.92 0 2.28 1.26 2.28 2.9v3.11h-1.9v-2.76c0-.66-.01-1.5-.92-1.5-.92 0-1.06.72-1.06 1.46v2.8h-1.9z" /></>,
  youtube: <><rect {...S} x="2.4" y="5.4" width="19.2" height="13.2" rx="3.6" /><path fill="currentColor" d="M10.2 8.9 15.4 12l-5.2 3.1z" /></>,
  google: <><path fill="#4285F4" d="M21.6 12.23c0-.7-.06-1.36-.18-2H12v3.79h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.74 2.98-4.3 2.98-7.31z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22z" /><path fill="#FBBC05" d="M6.41 13.9a6 6 0 0 1 0-3.83V7.48H3.06a10 10 0 0 0 0 9.02z" /><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.95 2.98 14.7 2 12 2a10 10 0 0 0-8.94 5.48l3.35 2.6C7.2 7.7 9.4 5.95 12 5.95z" /></>,
  quote: <path fill="currentColor" d="M9.6 5.6 6.4 11.2v7.2h6.4v-7.2H9.6l2.4-5.6zm8 0-3.2 5.6v7.2h6.4v-7.2h-3.2l2.4-5.6z" />,
};

/*
 * A picture uploaded through the website manager in place of a drawn icon. The
 * manager stores it the way it stores every picture, as a path such as
 * "/mySOS/assets/uploads/award-3f9c2a11.png".
 */
export const isIconPicture = (name) => /^(?:\/|https?:\/\/|data:image\/)/i.test(String(name ?? ''))
  || /\.(?:png|jpe?g|webp|gif|avif)$/i.test(String(name ?? ''));

/*
 * An icon, drawn from the set above or an uploaded picture.
 *
 * `cmsPath` is the content path of the field holding the icon's name. The
 * website manager marks the icon with it so that clicking the icon in its
 * preview opens the icon picker; data-cms-icon tells it the value is an icon,
 * not words to write into the element. (JSON.stringify is cms() from ../cms,
 * inlined: this file is also loaded on its own to build iconLibrary.json.)
 */
export default function Icon({ name, size = 25, className = '', title, cmsPath }) {
  const marks = cmsPath ? { 'data-cms-path': JSON.stringify(cmsPath), 'data-cms-icon': 'true' } : {};
  if (isIconPicture(name)) {
    return <img className={`icon icon-picture ${className}`.trim()} src={name} width={size} height={size} alt={title || ''} loading="lazy" decoding="async" {...marks} />;
  }
  const glyph = paths[name];
  if (!glyph) return null;
  return (
    <svg className={`icon ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" role={title ? 'img' : 'presentation'} aria-hidden={title ? undefined : 'true'} aria-label={title} focusable="false" {...marks}>
      {title && <title>{title}</title>}
      {glyph}
    </svg>
  );
}

export const hasIcon = (name) => Boolean(paths[name]) || isIconPicture(name);

/** The drawn icons by name, for building iconLibrary.json. */
export const iconGlyphs = paths;
