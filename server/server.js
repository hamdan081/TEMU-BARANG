/** TemuKampus classroom API. Node.js built-ins only; no external database required.
 * Development server for Week 4 (REST + DTO) and Week 5 (real server-issued tokens).
 * Production requires HTTPS, proper deployment/security reviews, and persistent database.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

const initialBarang = [
  {id:1,nama:'Dompet Hitam',kategori:'Aksesoris',deskripsi:'Dompet hitam dengan jahitan di sudut kiri.',lokasi:'Gedung A',tanggal:'2026-10-12',image:'',status:'Hilang',pelapor:'Tim Kampus',ownerId:0,verificationStatus:'Belum diverifikasi',verificationSecret:'jahitan kiri'},
  {id:2,nama:'Kunci Motor',kategori:'Aksesoris',deskripsi:'Kunci motor dengan gantungan berbentuk bintang.',lokasi:'Area Parkir',tanggal:'2026-10-13',image:'',status:'Ditemukan',pelapor:'Tim Kampus',ownerId:0,verificationStatus:'Belum diverifikasi',verificationSecret:'bintang'},
  {id:3,nama:'Laptop ASUS',kategori:'Elektronik',deskripsi:'Laptop warna abu-abu ditemukan terakhir di perpustakaan.',lokasi:'Perpustakaan',tanggal:'2026-10-14',image:'',status:'Hilang',pelapor:'Tim Kampus',ownerId:0,verificationStatus:'Belum diverifikasi',verificationSecret:'asus'},
  {id:4,nama:'Kartu Mahasiswa',kategori:'Dokumen',deskripsi:'Kartu mahasiswa ditemukan di dekat ruang kelas.',lokasi:'Gedung B',tanggal:'2026-10-15',image:'',status:'Ditemukan',pelapor:'Tim Kampus',ownerId:0,verificationStatus:'Belum diverifikasi',verificationSecret:'kampus'}
];
const b64url = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
const timingEqual = (a,b) => {
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && crypto.timingSafeEqual(x,y);
};
const hashPassword = password => {
  const salt=crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password,salt,64).toString('hex')}`;
};
const verifyPassword = (password, hashed) => {
  if (!hashed || typeof hashed!=='string' || !hashed.includes(':')) return false;
  const [salt,hex] = hashed.split(':');
  try {return timingEqual(crypto.scryptSync(password,salt,64).toString('hex'),hex);} catch {return false;}
};
function createApp({dataDir=path.join(__dirname,'data'),secret}={}) {
  fs.mkdirSync(dataDir,{recursive:true});
  const uploadsDir = path.join(dataDir, 'uploads');
  fs.mkdirSync(uploadsDir, {recursive: true});

  const uploadMiddleware = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadsDir),
      filename: (req, file, cb) => {
        const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
        const safeName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
        cb(null, safeName);
      }
    }),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif', 'application/octet-stream'];
      const ext = (path.extname(file.originalname) || '').toLowerCase();
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
      if (allowed.includes((file.mimetype || '').toLowerCase()) || allowedExts.includes(ext) || !file.mimetype) {
        cb(null, true);
      } else {
        const err = new Error('Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.');
        err.code = 'INVALID_FILE_TYPE';
        cb(err);
      }
    }
  }).fields([{ name: 'photo', maxCount: 1 }, { name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]);

  const secretFile=path.join(dataDir,'.secret');
  const signingSecret=secret || (fs.existsSync(secretFile)?fs.readFileSync(secretFile,'utf8'):crypto.randomBytes(48).toString('hex'));
  if(!secret && !fs.existsSync(secretFile)) fs.writeFileSync(secretFile,signingSecret,{mode:0o600});
  const dbFile=path.join(dataDir,'database.json');
  let db=fs.existsSync(dbFile)?JSON.parse(fs.readFileSync(dbFile,'utf8')):{users:[],barang:initialBarang,revokedJtis:[]};
  if (!db.users.some(u=>u.email==='demo@kampus.ac.id')) {
    db.users.push({id:1,name:'Mahasiswa Demo',email:'demo@kampus.ac.id',passwordHash:hashPassword('Demo123!')});
  }
  const save=()=>fs.writeFileSync(dbFile,JSON.stringify(db,null,2),{mode:0o600});
  save();
  const sign = payload=> {
    const first=b64url({alg:'HS256',typ:'JWT'}),second=b64url(payload);
    const signature=crypto.createHmac('sha256',signingSecret).update(`${first}.${second}`).digest('base64url');
    return `${first}.${second}.${signature}`;
  };
  function decodeToken(token) {
    if(!token||typeof token!=='string')return null;
    const parts=token.split('.');
    if(parts.length!==3)return null;
    const expected=crypto.createHmac('sha256',signingSecret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if(!timingEqual(expected,parts[2]))return null;
    try {
      const head=JSON.parse(Buffer.from(parts[0],'base64url').toString());
      const data=JSON.parse(Buffer.from(parts[1],'base64url').toString());
      if(head.alg!=='HS256')return null;
      return data;
    }catch{return null;}
  }
  function validateToken(token, expectedType='access') {
    const data=decodeToken(token);
    if(!data)return null;
    if(data.exp<=Math.floor(Date.now()/1000)||db.revokedJtis.includes(data.jti))return null;
    if(expectedType && (data.type || 'access') !== expectedType) return null;
    const user=db.users.find(u=>u.id===data.sub);
    return user?{user,tokenData:data}:null;
  }
  const publicUser=u=>({id:u.id,name:u.name,email:u.email});
  const publicBarang=b=>({id:b.id,nama:b.nama,kategori:b.kategori,deskripsi:b.deskripsi,lokasi:b.lokasi,tanggal:b.tanggal,image:b.image,status:b.status,pelapor:b.pelapor,ownerId:b.ownerId,verificationStatus:b.verificationStatus});
  const validStr=(x,min=1,max=150)=>typeof x==='string'&&x.trim().length>=min&&x.trim().length<=max;
  const attempts=new Map();
  const handler=async (req,res)=>{
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin','*'); // development only: no browser cookies
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, OPTIONS');
    const send=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
    if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET' && url.pathname==='/health')return send(200,{status:'ok',service:'TemuKampus Demo API'});
    if(req.method==='GET' && url.pathname==='/test/error-500')return send(500,{message:'Terjadi kesalahan internal pada server (simulasi pengujian).'});
    if(req.method==='GET' && url.pathname.startsWith('/uploads/')){
      const cleanName = path.basename(url.pathname);
      const filePath = path.join(uploadsDir, cleanName);
      if(!fs.existsSync(filePath)) return send(404, {message: 'Foto tidak ditemukan.'});
      const ext = path.extname(cleanName).toLowerCase();
      const types = {'.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp'};
      res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return fs.createReadStream(filePath).pipe(res);
    }
    let body={};
    if(['POST','PATCH'].includes(req.method) && url.pathname !== '/upload'){
      try {
        let raw='';
        for await(const chunk of req){raw+=chunk.toString(); if(raw.length>16384)return send(413,{message:'Payload terlalu besar.'});}
        body=raw?JSON.parse(raw):{};
      }catch{return send(400,{message:'Format JSON tidak valid.'});}
    }
    if(req.method==='POST'&&url.pathname==='/auth/register'){
      const name=body.name?.trim(),email=body.email?.trim().toLowerCase(),password=body.password;
      if(!validStr(name,2,100)||!validStr(email,5,120)||!email.includes('@')||!validStr(password,8,128))return send(400,{message:'Nama, email, atau password tidak valid (minimal 8 karakter).'});
      if(db.users.some(u=>u.email===email))return send(409,{message:'Akun sudah terdaftar.'});
      const id=Math.max(0,...db.users.map(u=>u.id))+1;
      db.users.push({id,name,email,passwordHash:hashPassword(password)});save();
      return send(201,{message:'Registrasi berhasil.',user:{id,name,email}});
    }
    if(req.method==='POST'&&url.pathname==='/auth/login'){
      const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
      const pass=typeof body.password==='string'?body.password:'';
      if(!email||!pass)return send(400,{message:'Email dan password wajib diisi.'});
      const now=Date.now(),key=req.socket.remoteAddress||'unknown';
      const record=attempts.get(key)||{count:0,until:0};
      if(record.until>now)return send(429,{message:'Terlalu banyak percobaan. Coba lagi nanti.'});
      const user=db.users.find(u=>u.email===email);
      if(!user||!verifyPassword(pass,user.passwordHash)){
        const count=record.count+1;attempts.set(key,{count:count>=12?0:count,until:count>=12?now+60000:0});
        return send(401,{message:'Email atau password salah.'});
      }
      attempts.delete(key);
      const nowSec = Math.floor(now/1000);
      const accessToken = sign({sub:user.id, type:'access', jti:crypto.randomUUID(), iat:nowSec, exp:nowSec + 3600});
      const refreshToken = sign({sub:user.id, type:'refresh', jti:crypto.randomUUID(), iat:nowSec, exp:nowSec + 7 * 86400});
      return send(200,{
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        user: publicUser(user)
      });
    }
    // Week 5 Task 03: Endpoint POST /auth/refresh untuk memperbarui access token via refresh token & token rotation
    if(req.method==='POST'&&url.pathname==='/auth/refresh'){
      const rToken = typeof body.refresh_token === 'string' ? body.refresh_token.trim() : '';
      if(!rToken) return send(400, {message: 'Refresh token wajib diisi.'});
      const valid = validateToken(rToken, 'refresh');
      if(!valid) return send(401, {message: 'Refresh token tidak valid, kedaluwarsa, atau telah dicabut.'});

      // Token rotation: cabut jti refresh token yang lama
      db.revokedJtis.push(valid.tokenData.jti);

      // Terbitkan access token baru dan refresh token baru
      const nowSec = Math.floor(Date.now()/1000);
      const newAccessToken = sign({sub:valid.user.id, type:'access', jti:crypto.randomUUID(), iat:nowSec, exp:nowSec + 3600});
      const newRefreshToken = sign({sub:valid.user.id, type:'refresh', jti:crypto.randomUUID(), iat:nowSec, exp:nowSec + 7 * 86400});
      save();

      return send(200, {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        user: publicUser(valid.user)
      });
    }
    // Week 5 Task 03: Endpoint POST /auth/logout - mencabut jti access token & refresh token pada server
    if(req.method==='POST'&&url.pathname==='/auth/logout'){
      const authorization=req.headers.authorization||'';
      const bearer=authorization.startsWith('Bearer ')?authorization.slice(7):'';
      let revokedCount = 0;

      if(bearer){
        const decoded = decodeToken(bearer);
        if(decoded && decoded.jti){
          if(!db.revokedJtis.includes(decoded.jti)) db.revokedJtis.push(decoded.jti);
          revokedCount++;
        }
      }
      if(body && typeof body.refresh_token === 'string' && body.refresh_token.trim()){
        const decodedRefresh = decodeToken(body.refresh_token.trim());
        if(decodedRefresh && decodedRefresh.jti){
          if(!db.revokedJtis.includes(decodedRefresh.jti)) db.revokedJtis.push(decodedRefresh.jti);
          revokedCount++;
        }
      }
      if(revokedCount === 0){
        return send(401, {message: 'Sesi tidak valid atau sudah berakhir. Silakan login.'});
      }
      save();
      return send(200, {message: 'Logout berhasil. Sesi dan token telah dicabut.'});
    }
    const authorization=req.headers.authorization||'';
    const auth=authorization.startsWith('Bearer ')?validateToken(authorization.slice(7)):null;
    if(!auth)return send(401,{message:'Sesi tidak valid atau sudah berakhir. Silakan login.'});
    if(req.method==='POST'&&url.pathname==='/upload'){
      const contentType = req.headers['content-type'] || '';
      if(contentType.includes('application/json')){
        let raw = '';
        try {
          for await(const chunk of req){
            raw += chunk.toString();
            if(raw.length > 25 * 1024 * 1024) return send(413, {message: 'Ukuran foto maksimal 25 MB.'});
          }
          const parsed = JSON.parse(raw);
          const base64Data = parsed.photoBase64 || parsed.base64 || parsed.image;
          if(!base64Data) return send(400, {message: 'Data foto base64 tidak ditemukan.'});
          const cleanB64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(cleanB64, 'base64');
          const ext = (parsed.ext || '.jpg').toLowerCase();
          const safeExt = ext.startsWith('.') ? ext : '.' + ext;
          const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          const host = req.headers.host || 'localhost:4000';
          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const fileUrl = `${protocol}://${host}/uploads/${filename}`;
          console.log(`[UPLOAD B64 OK] ${filename} (${buffer.length} bytes)`);
          return send(201,{
            message: 'Foto berhasil diunggah.',
            url: fileUrl,
            filename: filename,
            size: buffer.length,
            mimetype: 'image/jpeg'
          });
        } catch(e) {
          console.error('[UPLOAD B64 ERR]', e.message);
          return send(400, {message: 'Format data foto tidak valid.'});
        }
      }
      return uploadMiddleware(req, res, (err) => {
        if(err){
          console.error('[UPLOAD MULTIPART ERR]', err.message);
          if(err.code==='LIMIT_FILE_SIZE')return send(400,{message:'Ukuran file maksimal 25 MB.'});
          return send(400,{message:err.message||'Gagal memproses unggahan file.'});
        }
        const file = req.file || req.files?.photo?.[0] || req.files?.image?.[0] || req.files?.file?.[0];
        if(!file)return send(400,{message:'File foto tidak ditemukan dalam request (gunakan field "photo").'});
        const host = req.headers.host || 'localhost:4000';
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const fileUrl = `${protocol}://${host}/uploads/${file.filename}`;
        console.log(`[UPLOAD MULTIPART OK] ${file.filename} (${file.size} bytes)`);
        return send(201,{
          message:'Foto berhasil diunggah.',
          url:fileUrl,
          filename:file.filename,
          size:file.size,
          mimetype:file.mimetype
        });
      });
    }
    if(req.method==='GET'&&url.pathname==='/me')return send(200,{user:publicUser(auth.user)});

    if(req.method==='GET'&&url.pathname==='/barang'){
      return send(200,{data:db.barang.slice().sort((a,b)=>b.id-a.id).map(publicBarang)});
    }
    if(req.method==='POST'&&url.pathname==='/barang'){
      const required=['nama','kategori','deskripsi','lokasi','status'];
      if(required.some(k=>!validStr(body[k],1,k==='deskripsi'?600:130))||!['Hilang','Ditemukan'].includes(body.status)||!validStr(body.verificationSecret,4,100))return send(400,{message:'Lengkapi laporan dan ciri rahasia barang (minimal 4 karakter).'});
      const id=Math.max(0,...db.barang.map(b=>b.id))+1;
      const b={id,nama:body.nama.trim(),kategori:body.kategori.trim(),deskripsi:body.deskripsi.trim(),lokasi:body.lokasi.trim(),tanggal:new Date().toISOString().slice(0,10),image:validStr(body.image,1,1000)?body.image:'',status:body.status,pelapor:auth.user.name,ownerId:auth.user.id,verificationStatus:'Belum diverifikasi',verificationSecret:body.verificationSecret.trim().toLocaleLowerCase('id')};
      db.barang.push(b);save();return send(201,{data:publicBarang(b)});
    }
    const match=url.pathname.match(/^\/barang\/(\d+)(?:\/(verify|status))?$/);
    if(match){
      const b=db.barang.find(x=>x.id===Number(match[1]));
      if(!b)return send(404,{message:'Barang tidak ditemukan.'});
      if(req.method==='GET'&&!match[2])return send(200,{data:publicBarang(b)});
      if(req.method==='POST'&&match[2]==='verify'){
        const key=`verify:${auth.user.id}:${b.id}`,now=Date.now();
        const recent=(attempts.get(key)||[]).filter(t=>now-t<15*60*1000);
        if(recent.length>=5)return send(429,{message:'Batas percobaan verifikasi tercapai.'});
        recent.push(now);attempts.set(key,recent);
        if(!validStr(body.jawaban,1,100)||!timingEqual(body.jawaban.trim().toLocaleLowerCase('id'),b.verificationSecret))return send(400,{message:'Verifikasi belum berhasil. Periksa kembali ciri khusus.'});
        b.verificationStatus='Terverifikasi';save();return send(200,{data:publicBarang(b),message:'Verifikasi berhasil. Hubungi pelapor untuk pengambilan.'});
      }
      if(req.method==='PATCH'&&match[2]==='status'){
        if(b.ownerId!==auth.user.id)return send(403,{message:'Hanya pembuat laporan yang dapat memperbarui status.'});
        if(body.status!=='Dikembalikan'||b.verificationStatus!=='Terverifikasi')return send(400,{message:'Barang harus terverifikasi sebelum ditandai dikembalikan.'});
        b.status='Dikembalikan';save();return send(200,{data:publicBarang(b)});
      }
    }
    return send(404,{message:'Endpoint tidak ditemukan.'});
  };
  return http.createServer((req,res)=>Promise.resolve(handler(req,res)).catch(()=>{if(!res.writableEnded){res.statusCode=500;res.end(JSON.stringify({message:'Kesalahan server.'}));}}));
}
if(require.main===module){
  const port=Number(process.env.PORT||4000);
  createApp().listen(port,'0.0.0.0',()=>console.log(`TemuKampus API siap di port ${port} (LAN; HTTPS wajib untuk deployment publik)`));
}
module.exports={createApp};
