const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
(async () => {
  const path = 'C:/Users/WOO/Downloads/imposition_image_cmo9ynp8r0002k70sn0j3rzr8.pdf';
  if (!fs.existsSync(path)) { console.log('NOT FOUND'); return; }
  const bytes = fs.readFileSync(path);
  const doc = await PDFDocument.load(bytes);
  console.log('pageCount:', doc.getPageCount());
  for (let i = 0; i < Math.min(5, doc.getPageCount()); i++) {
    const p = doc.getPage(i);
    const r = p.node.Resources();
    const xobj = r ? r.lookup(PDFName.of('XObject')) : null;
    let imgs = 0;
    if (xobj && xobj.dict) {
      for (const [, v] of xobj.dict) {
        const o = doc.context.lookup(v);
        if (o && o.dict) {
          const sub = o.dict.get(PDFName.of('Subtype'));
          if (sub && sub.toString() === '/Image') imgs++;
        }
      }
    }
    console.log(`page${i+1}: imgs=${imgs}`);
  }
})();
