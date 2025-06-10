// Utilidades
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(';');
  return lines.map(line => {
    const cols = line.split(';');
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = cols[i] ? cols[i].trim() : '');
    return obj;
  });
}

function number(value) {
  const val = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(val) ? 0 : val;
}

function formatKS(value) {
  return `S/ ${value.toFixed(2)}k`;
}

// Estado global
let data = [];

// Lectura de archivo
const input = document.getElementById('csvFile');
input.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  data = parseCSV(text);
  inicializarDashboard();
});

function inicializarDashboard() {
  calcularResumen();
  poblarFiltros();
  renderTab1();
  renderTab2();
  renderTab3();
  renderTab4();
  renderTab5();
}

// Calculo de resumen
function calcularResumen() {
  const total = data.reduce((sum, r) => sum + number(r['Valor Total ingresado en USD']) * number(r['Tipo de cambio']), 0) / 1000;
  const ocs = [...new Set(data.map(r => r['Documento compras']))].length;
  const items = data.reduce((sum, r) => sum + number(r['Cantidad de pedido']), 0);
  document.getElementById('totalGasto').textContent = formatKS(total);
  document.getElementById('totalOCs').textContent = ocs;
  document.getElementById('totalItems').textContent = items;
}

// Filtros
function poblarFiltros() {
  const familias = [...new Set(data.map(r => r['Familia']))];
  const grupos = [...new Set(data.map(r => r['Grupo de artículos']))];
  const meses = [...new Set(data.map(r => r['Fecha documento'].slice(3,10)))];
  setOptions('filtroFamilia', familias);
  setOptions('filtroGrupo', grupos);
  setOptions('filtroMes', meses);

  setOptions('filtroFamilia2', familias);
  setOptions('filtroMes2', meses);
  const compradores = [...new Set(data.map(r => r['Comprador']))];
  setOptions('filtroComprador', compradores);

  setOptions('filtroProveedor', [...new Set(data.map(r => r['Proveedor']))]);
  setOptions('filtroFamilia3', familias);

  setOptions('filtroGrupo4', grupos);
  setOptions('filtroProveedor4', [...new Set(data.map(r => r['Proveedor']))]);

  setOptions('filtroMes5', meses);
  setOptions('filtroEstado5', [...new Set(data.map(r => r['Estado liberación']))]);
  setOptions('filtroBorrado5', [...new Set(data.map(r => r['Indicador de borrado']))]);
}

function setOptions(id, values) {
  const select = document.getElementById(id);
  select.innerHTML = '<option value="">Todos</option>' + values.map(v => `<option value="${v}">${v}</option>`).join('');
}

// Tab 1
function renderTab1() {
  const ctx1 = document.getElementById('chartFamilia');
  const ctx2 = document.getElementById('chartGrupo');
  const ctx3 = document.getElementById('chartMensual');
  const resumen = {};
  const grupo = {};
  const mensual = {};
  data.forEach(r => {
    const val = number(r['Valor Total ingresado en USD']) * number(r['Tipo de cambio']) / 1000;
    resumen[r['Familia']] = (resumen[r['Familia']] || 0) + val;
    grupo[r['Grupo de artículos']] = (grupo[r['Grupo de artículos']] || 0) + val;
    const mes = r['Fecha documento'].slice(3,10);
    mensual[mes] = (mensual[mes] || 0) + val;
  });
  new Chart(ctx1, {type:'bar',data:{labels:Object.keys(resumen),datasets:[{label:'Gasto (k S/)',data:Object.values(resumen)}]}});
  new Chart(ctx2, {type:'pie',data:{labels:Object.keys(grupo),datasets:[{data:Object.values(grupo)}]}});
  new Chart(ctx3, {type:'line',data:{labels:Object.keys(mensual),datasets:[{label:'Mensual (k S/)',data:Object.values(mensual)}]}});
}

// Tab 2
function renderTab2() {
  const ranking = {};
  data.forEach(r => {
    const val = number(r['Valor Total ingresado en USD']) * number(r['Tipo de cambio']) / 1000;
    ranking[r['Comprador']] = (ranking[r['Comprador']] || 0) + val;
  });
  const sorted = Object.entries(ranking).sort((a,b)=>b[1]-a[1]);
  const ctx = document.getElementById('chartRankingCompradores');
  new Chart(ctx,{type:'bar',data:{labels:sorted.map(s=>s[0]),datasets:[{label:'Gasto (k S/)',data:sorted.map(s=>s[1])}]}});
  const ctxPie = document.getElementById('chartPieCompradores');
  new Chart(ctxPie,{type:'pie',data:{labels:sorted.map(s=>s[0]),datasets:[{data:sorted.map(s=>s[1])}]}});
  $('#tablaCompradores').DataTable({data:sorted.map(s=>[s[0],s[1]]),columns:[{title:'Comprador'},{title:'Gasto (k S/)'}]});
}

// Tab 3
function renderTab3() {
  const map = {};
  data.forEach(r=>{
    const val=number(r['Valor Total ingresado en USD'])*number(r['Tipo de cambio'])/1000;
    map[r['Proveedor']] = (map[r['Proveedor']] || 0) + val;
  });
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const ctx = document.getElementById('chartTopProveedores');
  new Chart(ctx,{type:'bar',data:{labels:sorted.map(s=>s[0]),datasets:[{label:'Gasto (k S/)',data:sorted.map(s=>s[1])}]}});
  const ctxPie=document.getElementById('chartPieProveedores');
  new Chart(ctxPie,{type:'pie',data:{labels:sorted.map(s=>s[0]),datasets:[{data:sorted.map(s=>s[1])}]}});
  $('#tablaProveedores').DataTable({data:sorted.map(s=>[s[0],s[1]]),columns:[{title:'Proveedor'},{title:'Gasto (k S/)'}]});
}

// Tab 4
function renderTab4() {
  const precioMaterial={};
  data.forEach(r=>{
    const mat=r['Material'];
    const val=number(r['Precio neto']);
    if(!precioMaterial[mat]) precioMaterial[mat]={sum:0,count:0};
    precioMaterial[mat].sum+=val;
    precioMaterial[mat].count++;
  });
  const labels=Object.keys(precioMaterial);
  const proms=labels.map(m=>precioMaterial[m].sum/precioMaterial[m].count);
  new Chart(document.getElementById('chartPrecioMaterial'),{type:'bar',data:{labels:labels,datasets:[{label:'Precio neto prom.',data:proms}]}});
  const comparacion=data.map(r=>({x:number(r['Precio unitarios']),y:number(r['Precio neto'])}));
  new Chart(document.getElementById('chartPrecioComparacion'),{type:'scatter',data:{datasets:[{label:'Unitario vs Neto',data:comparacion}]}});
  $('#tablaPrecios').DataTable({data:data.map(r=>[r['Material'],r['Proveedor'],r['Precio neto'],r['Precio unitarios']]),columns:[{title:'Material'},{title:'Proveedor'},{title:'Precio neto'},{title:'Precio unitario'}]});
}

// Tab 5
function renderTab5() {
  const estadoMap={};
  let borradoCount=0;
  data.forEach(r=>{
    estadoMap[r['Estado liberación']] = (estadoMap[r['Estado liberación']]||0)+1;
    if(r['Indicador de borrado']) borradoCount++;
  });
  const estados=Object.entries(estadoMap).map(([k,v])=>`${k}: ${v}`).join(', ');
  document.getElementById('estadoConteo').textContent=estados;
  document.getElementById('porcBorrado').textContent=((borradoCount/data.length)*100).toFixed(2)+'%';
  $('#tablaOrdenes').DataTable({data:data,columns:Object.keys(data[0]).map(h=>({title:h,data:h}))});
}

// Navegación
const buttons=document.querySelectorAll('#tabs button');
buttons.forEach(btn=>{
  btn.addEventListener('click',()=>{
    buttons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(tab=>tab.classList.remove('active'));
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});
