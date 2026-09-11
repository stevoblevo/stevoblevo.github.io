// Add two already-public review images, kept distinct from original artwork.
const processItems=[['browser-study','Earlier image-browser study','png'],['art-proof','Recovered-world contact sheet','jpg']];
const wall=document.getElementById('wall');
for(const [id,title,ext] of processItems){
 const article=document.createElement('article');article.className='tile';article.dataset.id=id;article.dataset.room='process';
 const a=document.createElement('a');a.className='image-link';a.dataset.art=id;a.href='../assets/process/'+id+'.'+ext;
 const image=document.createElement('img');image.src='../assets/process/'+id+'-thumb.webp';image.alt=title;image.loading='lazy';a.append(image);
 const caption=document.createElement('div');caption.className='tile-caption';const h=document.createElement('h2');h.textContent=title;const label=document.createElement('span');label.textContent='Process · not an additional original artwork';caption.append(h,label);article.append(a,caption);wall.append(article);
}
const button=document.createElement('button');button.dataset.room='process';button.textContent='Process';button.setAttribute('aria-pressed','false');document.querySelector('.rooms').append(button);
const link=document.createElement('a');link.href='../receipts/ingress-trail.json';link.textContent='Search and image-ingress checkpoint ↗';document.querySelector('.receipt-grid section').append(link);
document.getElementById('count').textContent='12 artworks · 2 process images';
