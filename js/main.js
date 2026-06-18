const map = L.map('map').setView([-7.98,112.63],12);

L.tileLayer(
'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
{
attribution:'© OpenStreetMap'
}
).addTo(map);

let sdLayer;
let areaLayerAktif = null;
let jangkauanLayerAktif = null;

const warnaCluster = {
0:'#e41a1c',
1:'#377eb8',
2:'#4daf4a',
3:'#984ea3',
4:'#ff7f00'
};

Promise.all([

fetch('data/sd.geojson').then(r=>r.json()),
fetch('data/desa.geojson').then(r=>r.json()),
fetch('data/jalan.geojson').then(r=>r.json()),
fetch('data/jangkauan.geojson').then(r=>r.json()),
fetch('data/area terlayani.geojson').then(r=>r.json())

])

.then(([sd,desa,jalan,jangkauan,area])=>{

// ======================
// STATISTIK
// ======================

document.getElementById('totalSD').innerHTML =
sd.features.length;

document.getElementById('sdNegeri').innerHTML =
sd.features.filter(
f=>f.properties.status_1==='Negeri'
).length;

document.getElementById('sdSwasta').innerHTML =
sd.features.filter(
f=>f.properties.status_1==='Swasta'
).length;

document.getElementById('totalDesa').innerHTML =
desa.features.length;

const jumlahCluster =
new Set(
sd.features.map(
f=>f.properties.CLUSTER_ID
)
).size;

document.getElementById('totalCluster').innerHTML =
jumlahCluster;

// ======================
// RATA RATA PELAYANAN
// ======================

let totalPelayanan = 0;

desa.features.forEach(f=>{

totalPelayanan += Number(
f.properties["Clipped_pct terlayani"] || 0
);

});

const rataPelayanan =
(
totalPelayanan /
desa.features.length
).toFixed(2);

document.getElementById('avgPelayanan').innerHTML =
rataPelayanan + '%';

// ======================
// KELURAHAN
// ======================

const desaLayer = L.geoJSON(desa,{

style:{
color:'#1565c0',
weight:1,
fillOpacity:0.08
},

onEachFeature:(feature,layer)=>{

layer.bindPopup(`

<b>${feature.properties.WADMKD}</b>

<br>

Kecamatan :
${feature.properties.WADMKC}

<br>

Persentase Terlayani :
${feature.properties["Clipped_pct terlayani"]} %

<br>

Kategori :
${feature.properties["Clipped_kategorii"]}

`);

}

}).addTo(map);

// ======================
// JALAN
// ======================

const jalanLayer = L.geoJSON(jalan,{

style:{
color:'#777',
weight:1
}

}).addTo(map);

// ======================
// CLUSTER INTERAKTIF
// ======================

function tampilCluster(clusterId){

if(areaLayerAktif){

map.removeLayer(areaLayerAktif);
areaLayerAktif = null;

}

if(jangkauanLayerAktif){

map.removeLayer(jangkauanLayerAktif);
jangkauanLayerAktif = null;

}

areaLayerAktif = L.geoJSON(area,{

filter:f=>
String(
f.properties.CLUSTER_ID
)===String(clusterId),

style:{
color:'#ff9800',
weight:2,
fillColor:'#ffc107',
fillOpacity:0.45
}

}).addTo(map);

jangkauanLayerAktif = L.geoJSON(jangkauan,{

filter:f=>
String(
f.properties.CLUSTER_ID
)===String(clusterId),

style:{
color:'red',
weight:3
}

}).addTo(map);

}

// ======================
// SD
// ======================

function buatLayerSD(data){

return L.geoJSON(data,{

pointToLayer:(feature,latlng)=>{

const warna =
warnaCluster[
feature.properties.CLUSTER_ID
] || '#000';

return L.circleMarker(latlng,{

radius:7,
fillColor:warna,
fillOpacity:1,
color:'white',
weight:1

});

},

onEachFeature:(feature,layer)=>{

layer.bindPopup(`

<b>${feature.properties.remark}</b>

<br><br>

Alamat :
${feature.properties.alamat_1 || '-'}

<br>

Status :
${feature.properties.status_1 || '-'}

<br>

Cluster :
${feature.properties.CLUSTER_ID}

<br>

Jumlah SD Cluster :
${feature.properties.CLUSTER_SIZE}

`);

layer.on('click',()=>{

tampilCluster(
feature.properties.CLUSTER_ID
);

});

}

});

}

sdLayer =
buatLayerSD(sd);

sdLayer.addTo(map);

// ======================
// SEARCH
// ======================

document
.getElementById('searchInput')
.addEventListener('keyup',function(){

const keyword =
this.value.toLowerCase();

sdLayer.eachLayer(layer=>{

const nama =
(
layer.feature.properties.remark || ''
).toLowerCase();

if(nama.includes(keyword)){

layer.setStyle({
radius:10
});

layer.openPopup();

}
else{

layer.setStyle({
radius:7
});

}

});

});

// ======================
// FILTER
// ======================

document
.getElementById('statusFilter')
.addEventListener('change',function(){

const status =
this.value;

map.removeLayer(sdLayer);

const hasil = {

type:'FeatureCollection',

features:
sd.features.filter(f=>{

if(status==='all')
return true;

return f.properties.status_1===status;

})

};

sdLayer =
buatLayerSD(hasil);

sdLayer.addTo(map);

});

// ======================
// LAYER CONTROL
// ======================

L.control.layers(

{},

{

'Kelurahan':desaLayer,
'Jalan':jalanLayer

},

{
collapsed:false
}

).addTo(map);

// ======================
// CHART STATUS
// ======================

new Chart(

document.getElementById('chartStatus'),

{

type:'pie',

data:{

labels:[
'Negeri',
'Swasta'
],

datasets:[{

data:[

sd.features.filter(
f=>f.properties.status_1==='Negeri'
).length,

sd.features.filter(
f=>f.properties.status_1==='Swasta'
).length

]

}]

}

}

);

// ======================
// CHART CLUSTER
// ======================

const clusterCount = {};

sd.features.forEach(f=>{

const c =
f.properties.CLUSTER_ID;

clusterCount[c] =
(clusterCount[c] || 0)+1;

});

new Chart(

document.getElementById('chartCluster'),

{

type:'bar',

data:{

labels:
Object.keys(clusterCount),

datasets:[{

label:'Jumlah SD',

data:
Object.values(clusterCount)

}]

}

}

);

// ======================
// TOP 10 KELURAHAN
// ======================

const topKelurahan =
desa.features
.map(f=>({

nama:
f.properties.WADMKD,

nilai:
Number(
f.properties["Clipped_pct terlayani"]
)

}))
.sort((a,b)=>b.nilai-a.nilai)
.slice(0,10);

new Chart(

document.getElementById('chartKelurahan'),

{

type:'bar',

data:{

labels:
topKelurahan.map(
d=>d.nama
),

datasets:[{

label:'% Terlayani',

data:
topKelurahan.map(
d=>d.nilai
)

}]

},

options:{
indexAxis:'y'
}

}

);

// ======================
// KATEGORI
// ======================

const kategori = {};

desa.features.forEach(f=>{

const k =
f.properties["Clipped_kategorii"];

kategori[k] =
(kategori[k] || 0)+1;

});

new Chart(

document.getElementById('chartKategori'),

{

type:'doughnut',

data:{

labels:
Object.keys(kategori),

datasets:[{

data:
Object.values(kategori)

}]

}

}

);

map.fitBounds(
desaLayer.getBounds()
);

})

.catch(err=>{

console.error(err);

alert(
'Gagal memuat GeoJSON'
);

});