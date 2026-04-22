const { PDFDocument, PDFName, PDFArray, PDFNumber, PDFOperator } = require('pdf-lib');
const fs = require('fs');
(async () => {
  const path = 'C:/Users/WOO/Downloads/imposition_image_cmo9y6zly0005zlzix1xo9tdu.pdf';
  if (!fs.existsSync(path)) { console.log('NOT FOUND'); return; }
  const bytes = fs.readFileSync(path);
  const doc = await PDFDocument.load(bytes);
  const p0 = doc.getPage(0);
  console.log('pageCount:', doc.getPageCount());
  console.log('page0 pt:', p0.getWidth().toFixed(1), 'x', p0.getHeight().toFixed(1));
  console.log('page0 mm:', (p0.getWidth()*25.4/72).toFixed(1), 'x', (p0.getHeight()*25.4/72).toFixed(1));
  console.log('page rotation:', p0.getRotation().angle);
  const node = p0.node;
  const contents = node.Contents();
  if (contents) {
    const stream = doc.context.lookup(contents);
    if (stream && stream.contents) {
      const text = Buffer.from(stream.contents).toString('latin1');
      // Find image-related ops
      const lines = text.split('\n');
      const interesting = lines.filter(l => /Do|cm/.test(l)).slice(0, 30);
      console.log('--- ops (cm/Do excerpt) ---');
      console.log(interesting.join('\n'));
    }
  }
  // List image XObjects on this page
  const resources = node.Resources();
  if (resources) {
    const xobj = resources.lookup(PDFName.of('XObject'));
    if (xobj) {
      console.log('--- XObjects ---');
      for (const [k, v] of xobj.dict || []) {
        const refTarget = doc.context.lookup(v);
        if (refTarget && refTarget.dict) {
          const w = refTarget.dict.get(PDFName.of('Width'));
          const h = refTarget.dict.get(PDFName.of('Height'));
          const subtype = refTarget.dict.get(PDFName.of('Subtype'));
          console.log(' ', k.toString(), 'subtype=', subtype?.toString(), 'w=', w?.toString(), 'h=', h?.toString());
        }
      }
    }
  }
})();
