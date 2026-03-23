(async () => {
   const res = await fetch('http://localhost:3001/api/auth/login', {
       method: 'POST', body: JSON.stringify({email: 'gonzalo@email.com', password: '123'}), headers: {'Content-Type': 'application/json'}
   });
   const { token } = await res.json();
   console.log('Token:', !!token);

   const mRes = await fetch('http://localhost:3001/api/months', {
       headers: { 'Authorization': `Bearer ${token}` }
   });
   const data = await mRes.json();
   console.log(JSON.stringify(data.slice(0, 2), null, 2));
})();
