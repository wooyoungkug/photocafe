(async ()=>{
  const tests = [
    ['Front 3002 /', 'http://localhost:3002/'],
    ['Front 3002 /dashboard','http://localhost:3002/dashboard'],
    ['Front 3000 /','http://localhost:3000/'],
    ['API health','http://localhost:3001/api/v1/health']
  ];

  for(const [name,url] of tests){
    try{
      const r = await fetch(url);
      console.log(name,'status',r.status);
      const txt = await r.text();
      console.log(name,'body preview:', txt.slice(0,200).replace(/\n/g,' '));
    }catch(e){
      console.log(name,'error',e.message);
    }
  }

  try{
    const login = await fetch('http://localhost:3001/api/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@printing-erp.com',password:'admin1234'})});
    const lj = await login.json();
    console.log('Login status',login.status);
    const token = lj.accessToken;
    console.log('Got token length', token?token.length:0);
    const dash = await fetch('http://localhost:3001/api/v1/statistics/dashboard',{headers:{Authorization:'Bearer '+token}});
    console.log('/statistics/dashboard status',dash.status);
    console.log('dashboard json', JSON.stringify(await dash.json(), null, 2));
  }catch(e){
    console.error('Login/dashboard error', e.message);
  }
})();
