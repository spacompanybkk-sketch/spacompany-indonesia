import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { parse } from 'node-html-parser';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8').split('\n').filter(l => l.includes('=')).map(l => {
    const [k, ...v] = l.split('=');
    return [k.trim(), v.join('=').trim()];
  })
);

const app = initializeApp({
  apiKey: env.PUBLIC_FIREBASE_API_KEY,
  authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

// Therapists 1000-1590 with YouTube links (from WordPress DB query)
const therapists = [
  {id:1601,name:"Somjit Bunsing",yt:"https://www.youtube.com/watch?v=bb65Ye5iwPA"},
  {id:1600,name:"Onanong",yt:"https://www.youtube.com/watch?v=dKAzzzth5vM"},
  {id:1599,name:"Pornwadee Aiyarat",yt:"https://youtube.com/shorts/HqHq-tUcc_E"},
  {id:1597,name:"Chayapa Yiamram",yt:"https://www.youtube.com/watch?v=tE6o0sSYMyc"},
  {id:1596,name:"Panisara",yt:"https://www.youtube.com/watch?v=VnmI8BjSlZs"},
  {id:1595,name:"Runglawan Boontam",yt:"https://www.youtube.com/watch?v=GeR52PDumM0"},
  {id:1593,name:"Parichat",yt:"https://www.youtube.com/watch?v=pxucndodBLY"},
  {id:1592,name:"Laphatsri Satanphattanajan",yt:"https://youtube.com/shorts/Kh8QEUBgE9o"},
  {id:1591,name:"Chutikarn Pimkot",yt:"https://www.youtube.com/watch?v=lLBiiNIKNro"},
  {id:1587,name:"Onnarin",yt:"https://www.youtube.com/watch?v=na-dCNHLecI"},
  {id:1584,name:"Wassamon (POY)",yt:"https://www.youtube.com/watch?v=iRl7313MiuU"},
  {id:1583,name:"Butsarakham Khwanphetr",yt:"https://youtube.com/shorts/d6eVDiQeBUM"},
  {id:1582,name:"Sarawut Phanklang",yt:"https://www.youtube.com/shorts/Wy3CakcjQgg"},
  {id:1581,name:"Naruemon",yt:"https://www.youtube.com/watch?v=660F-i23J14"},
  {id:1580,name:"Panrita",yt:"https://www.youtube.com/watch?v=a0p5t6jSuvQ"},
  {id:1579,name:"Saipin",yt:"https://www.youtube.com/watch?v=4EnOfIXNhq8"},
  {id:1578,name:"Pornthip",yt:"https://www.youtube.com/watch?v=htbLLErxWm0"},
  {id:1577,name:"Konnika",yt:"https://www.youtube.com/watch?v=C8OsprOdkC0"},
  {id:1576,name:"Laddaporn",yt:"https://www.youtube.com/watch?v=EN_eZwlnfNg"},
  {id:1575,name:"Santisuk Deanjam",yt:"https://www.youtube.com/watch?v=yEcC6X8lD20"},
  {id:1574,name:"Apinya",yt:"https://www.youtube.com/watch?v=VNGt2HC5sNA"},
  {id:1573,name:"Chayanatt",yt:"https://www.youtube.com/watch?v=xbZczKkS-x8"},
  {id:1572,name:"Suwannee Saengma",yt:"https://www.youtube.com/watch?v=r40pJiGEi8I"},
  {id:1571,name:"Simaporn Khamngam",yt:"https://www.youtube.com/watch?v=YDtQcJk_w5Y"},
  {id:1570,name:"Watcharaporn Chiwanit",yt:"https://www.youtube.com/watch?v=UWNytlfYul4"},
  {id:1569,name:"Thossapol Kasemsin",yt:"https://www.youtube.com/watch?v=_H-F4XSUYMc"},
  {id:1568,name:"Pennapa",yt:"https://www.youtube.com/watch?v=fB77T_KpVAQ"},
  {id:1567,name:"Naphatson",yt:"https://www.youtube.com/watch?v=u0cJvQQeti0"},
  {id:1566,name:"Wanna",yt:"https://youtu.be/xPl7rIBiwEs"},
  {id:1565,name:"Nuntaphat",yt:"https://www.youtube.com/watch?v=5lubyd9OS9c"},
  {id:1564,name:"Tuanjai",yt:"https://www.youtube.com/watch?v=vnlGv1yl_YM"},
  {id:1563,name:"Fasang",yt:"https://www.youtube.com/watch?v=XC8ZwEFx8sI"},
  {id:1562,name:"Paibul",yt:"https://www.youtube.com/watch?v=Sxxa2i9vdHM"},
  {id:1561,name:"Sangwan Phukongchai",yt:"https://youtu.be/hlXfqVH4aNU"},
  {id:1560,name:"Sanya Tangorn",yt:"https://www.youtube.com/watch?v=lCLFNlrqyX4"},
  {id:1559,name:"Nakin Mahasar",yt:"https://www.youtube.com/watch?v=7yNz-VBq-_w"},
  {id:1558,name:"Suwanan Kantamas",yt:"https://www.youtube.com/watch?v=JzClpCwhWCg"},
  {id:1557,name:"Boonyanuch",yt:"https://www.youtube.com/watch?v=DRt2T172L54"},
  {id:1556,name:"Chollada C",yt:"https://www.youtube.com/watch?v=_UgaLVyeiko"},
  {id:1554,name:"Pattama",yt:"https://www.youtube.com/watch?v=V-qsIQaJ6Vo"},
  {id:1553,name:"Daorin",yt:"https://www.youtube.com/watch?v=nSw4Jjj2M4o"},
  {id:1552,name:"Widaporn",yt:"https://www.youtube.com/watch?v=NyO03Y2IRTs"},
  {id:1551,name:"Sukanya",yt:"https://www.youtube.com/watch?v=PhoPEp6GVPQ"},
  {id:1550,name:"Jiratchaya",yt:"https://www.youtube.com/watch?v=RoWeF01Pk5A"},
  {id:1549,name:"Raphiporn",yt:"https://www.youtube.com/watch?v=GeunN3QKICs"},
  {id:1548,name:"Paweena",yt:"https://www.youtube.com/watch?v=7GJyd-VH6ro"},
  {id:1547,name:"Rinlada",yt:"https://www.youtube.com/watch?v=PDxJiNCAeB4"},
  {id:1546,name:"Phakthanan",yt:"https://www.youtube.com/watch?v=F7ybW8qktFk"},
  {id:1545,name:"Ratchanikon",yt:"https://www.youtube.com/watch?v=P8yNjPWz_9k"},
  {id:1544,name:"Yupin Polyares",yt:"https://www.youtube.com/watch?v=ViqKR_V-naA"},
  {id:1541,name:"Sujitra",yt:"https://www.youtube.com/watch?v=Q6shgHX9hjg"},
  {id:1540,name:"Uraiwan",yt:"https://www.youtube.com/watch?v=qKjJaej1id8"},
  {id:1539,name:"Saowalak",yt:"https://www.youtube.com/watch?v=OZvi4YD5LEw"},
  {id:1538,name:"Jiraporn",yt:"https://www.youtube.com/watch?v=nGkdTEKxcS8"},
  {id:1537,name:"Pornsuda",yt:"https://www.youtube.com/watch?v=tENTPSD-Bms"},
  {id:1536,name:"Khanittha",yt:"https://www.youtube.com/watch?v=15JBTywjkLo"},
  {id:1534,name:"Duangduen",yt:"https://www.youtube.com/watch?v=yz54JOiaUhM"},
  {id:1533,name:"Ampha",yt:"https://www.youtube.com/watch?v=rFzWhrvIQTw"},
  {id:1532,name:"Waewta",yt:"https://www.youtube.com/watch?v=KZVKiFyeOL4"},
  {id:1531,name:"Rapeeporn",yt:"https://www.youtube.com/watch?v=_S0Qxw7hJRY"},
  {id:1528,name:"Nattanicha",yt:"https://www.youtube.com/watch?v=LEWcc0KasuM"},
  {id:1527,name:"Jirarat Sripaoaiam",yt:"https://www.youtube.com/watch?v=kr1cDuqaEwU"},
  {id:1526,name:"Prompan",yt:"https://www.youtube.com/watch?v=lhR2kjU3i98"},
  {id:1524,name:"Juthamat",yt:"https://www.youtube.com/watch?v=TM1m1HvNlaw"},
  {id:1523,name:"Pratthana Chanakool",yt:"https://www.youtube.com/watch?v=XqClr-fl0kk"},
  {id:1521,name:"Siriporn",yt:"https://www.youtube.com/watch?v=rhe7MSMszAU"},
  {id:1520,name:"Amonrat",yt:"https://www.youtube.com/watch?v=EnljxXbBGeU"},
  {id:1519,name:"Nuchjaree",yt:"https://www.youtube.com/watch?v=HsTGNdiFN2g"},
  {id:1518,name:"Shotika",yt:"https://www.youtube.com/watch?v=Jk4Tzw6lc4I"},
  {id:1515,name:"Roopngam",yt:"https://youtube.com/shorts/qbF7XJDdEaI"},
  {id:1514,name:"Sutpiesarn",yt:"https://www.youtube.com/watch?v=rdBgsyFsW6o"},
  {id:1513,name:"Nattida",yt:"https://www.youtube.com/watch?v=CXmpViR1MOQ"},
  {id:1512,name:"Anchalee",yt:"https://www.youtube.com/watch?v=JrWmEXOJueg"},
  {id:1511,name:"Siphrae",yt:"https://www.youtube.com/watch?v=Mh6pvR8LMW4"},
  {id:1510,name:"Sukunya",yt:"https://www.youtube.com/watch?v=0eQyElyLjSM"},
  {id:1509,name:"Kasamsri",yt:"https://www.youtube.com/watch?v=DFNX3h60y8k"},
  {id:1507,name:"Tinravee",yt:"https://www.youtube.com/watch?v=VsBhlrEb204"},
  {id:1506,name:"Kaiwit",yt:"https://www.youtube.com/watch?v=SjuTuY2kKO0"},
  {id:1504,name:"Monporn",yt:"https://www.youtube.com/watch?v=21fKpYURrdM"},
  {id:1503,name:"Orathai",yt:"https://www.youtube.com/watch?v=5RJKvlHE1v8"},
  {id:1501,name:"Mayurachat",yt:"https://www.youtube.com/watch?v=f2LOz5PVtgw"},
  {id:1499,name:"Yupin",yt:"https://www.youtube.com/watch?v=Jd6EpgetSMo"},
  {id:1498,name:"Wachiraporn",yt:"https://www.youtube.com/watch?v=nreZRFJ9_ZM"},
  {id:1497,name:"Yaowared",yt:"https://www.youtube.com/watch?v=lJWfRJh6y2E"},
  {id:1495,name:"Napaporn",yt:"https://www.youtube.com/watch?v=xbmrGa7Nqp8"},
  {id:1494,name:"Aranya",yt:"https://www.youtube.com/watch?v=xhbfDqJtEA8"},
  {id:1493,name:"Sirada",yt:"https://www.youtube.com/watch?v=ciuNCXUfsgA"},
  {id:1492,name:"Sunisa",yt:"https://www.youtube.com/watch?v=74ZexuQw1FE"},
  {id:1491,name:"Watcharaphon",yt:"https://www.youtube.com/watch?v=R_A_7nkkFxQ"},
  {id:1490,name:"Kitsakorn",yt:"https://www.youtube.com/watch?v=v21aOrcMAzg"},
  {id:1488,name:"Kanyawee",yt:"https://www.youtube.com/watch?v=ZgCCwd5ewW0"},
  {id:1485,name:"Netnapa Pairot",yt:"https://www.youtube.com/watch?v=CtSj5PbuFI4"},
  {id:1484,name:"Tippawan",yt:"https://www.youtube.com/watch?v=mOgr5Aa3h0I"},
  {id:1483,name:"Lapatrada",yt:"https://www.youtube.com/watch?v=3TEj9jEtUMQ"},
  {id:1482,name:"Khwananong",yt:"https://www.youtube.com/watch?v=rjmEBiyPxfk"},
  {id:1480,name:"Kullaphat",yt:"https://www.youtube.com/watch?v=xKsQGT7Ck5E"},
  {id:1478,name:"Pannida",yt:"https://www.youtube.com/watch?v=WNtH3MSJz-o"},
  {id:1477,name:"Saifon",yt:"https://www.youtube.com/watch?v=CBZe692_tiI"},
  {id:1476,name:"Visa Kaewsanthia",yt:"https://www.youtube.com/watch?v=ycmoCd_kViY"},
  {id:1475,name:"Wiranphat",yt:"https://www.youtube.com/watch?v=GTwaWoc9aCQ"},
  {id:1474,name:"Kamonkan",yt:"https://www.youtube.com/watch?v=MxmMiRNGPpQ"},
  {id:1471,name:"Piyaporn",yt:"https://www.youtube.com/watch?v=Z4rK7dhiEHM"},
  {id:1468,name:"Premjai",yt:"https://www.youtube.com/watch?v=4RnKgWrp5Tc"},
  {id:1467,name:"Dawika",yt:"https://www.youtube.com/watch?v=vkBTw5TUyqg"},
  {id:1466,name:"Jiraya",yt:"https://www.youtube.com/watch?v=RKqv0JznpPM"},
  {id:1465,name:"Pattarawan",yt:"https://www.youtube.com/watch?v=VkEnWbq_F8U"},
  {id:1464,name:"Naritha",yt:"https://www.youtube.com/watch?v=v-2zYxO7pXk"},
  {id:1463,name:"Warinphak",yt:"https://www.youtube.com/watch?v=KmKQFhCui-k"},
  {id:1462,name:"Daojai",yt:"https://www.youtube.com/watch?v=_gdIOk2xJhA"},
  {id:1461,name:"Kunnada",yt:"https://www.youtube.com/watch?v=zguHRQx7MGY"},
  {id:1460,name:"Sukontha",yt:"https://www.youtube.com/watch?v=cBofq4f5M9M"},
  {id:1459,name:"Wilai",yt:"https://www.youtube.com/watch?v=m-Mr-ls-WnY"},
  {id:1458,name:"Maneenet",yt:"https://www.youtube.com/watch?v=q-n_i4q1YU4"},
  {id:1457,name:"Apinya",yt:"https://www.youtube.com/watch?v=IG8_DiQf7g8"},
  {id:1456,name:"Kotchaphon",yt:"https://www.youtube.com/watch?v=hnxNZntvfbk"},
  {id:1455,name:"Kampai",yt:"https://www.youtube.com/watch?v=B53KrVldFhY"},
  {id:1454,name:"Orathai",yt:"https://www.youtube.com/watch?v=3pbYYY7VdxA"},
  {id:1453,name:"Vethanee",yt:"https://www.youtube.com/watch?v=GDcK3lu_LRs"},
  {id:1452,name:"Darunrat",yt:"https://www.youtube.com/watch?v=r1gHEhxWj_g"},
  {id:1451,name:"Pornrattana",yt:"https://www.youtube.com/watch?v=-rjvxx9k0os"},
  {id:1449,name:"Nattacha",yt:"https://www.youtube.com/watch?v=cMAF3a9f2f8"},
  {id:1448,name:"Urairat",yt:"https://www.youtube.com/watch?v=OtLS8l_8LbE"},
  {id:1446,name:"Prechaya",yt:"https://www.youtube.com/watch?v=De1e0fZdnzU"},
  {id:1445,name:"Sunisa",yt:"https://www.youtube.com/watch?v=MAA6GYrYYgg"},
  {id:1443,name:"Pranom Sukdee",yt:"https://www.youtube.com/watch?v=IumEa3Hrbsc"},
  {id:1442,name:"Parichart",yt:"https://www.youtube.com/watch?v=ogOKBT_0hQc"},
  {id:1441,name:"Supattra",yt:"https://www.youtube.com/watch?v=VGwYzDIm3kQ"},
  {id:1440,name:"Boonrueang",yt:"https://www.youtube.com/watch?v=TyYFNHK21fY"},
  {id:1439,name:"THANAPORN",yt:"https://www.youtube.com/watch?v=8DKCTSRQYKQ"},
  {id:1438,name:"Tammarat",yt:"https://www.youtube.com/watch?v=pHmPxRAPs1M"},
  {id:1437,name:"Palika",yt:"https://www.youtube.com/watch?v=2Wluixkm7ew"},
  {id:1436,name:"Thitaya",yt:"https://www.youtube.com/watch?v=grRxaW6RLLI"},
  {id:1435,name:"Jaruwan",yt:"https://www.youtube.com/watch?v=GEJpL1sTdzY"},
  {id:1433,name:"Nattawadee",yt:"https://www.youtube.com/watch?v=-g8pu_75EJY"},
  {id:1432,name:"Thidarat",yt:"https://www.youtube.com/watch?v=M-lbCiDD4Mk"},
  {id:1431,name:"Nitaya",yt:"https://www.youtube.com/watch?v=qjX3C5QQyEI"},
  {id:1430,name:"Chalinntra",yt:"https://www.youtube.com/watch?v=MEBcwXXM6ho"},
  {id:1429,name:"Thanyaphorn",yt:"https://www.youtube.com/watch?v=4lRNqUlXFfI"},
  {id:1427,name:"Natchanan",yt:"https://www.youtube.com/watch?v=RuokxkddINA"},
  {id:1426,name:"Pimtawan",yt:"https://www.youtube.com/watch?v=SOgLVYNL570"},
  {id:1424,name:"Chanphen",yt:"https://www.youtube.com/watch?v=oYD2yWBCZns"},
  {id:1423,name:"Julalak",yt:"https://www.youtube.com/watch?v=uqsP7J34irY"},
  {id:1422,name:"Pornthiporn",yt:"https://www.youtube.com/watch?v=pibiqBDP3ok"},
  {id:1421,name:"Darunee",yt:"https://www.youtube.com/watch?v=IRCWQnr2FJY"},
  {id:1420,name:"Jaroonrat",yt:"https://www.youtube.com/watch?v=21iG_CmO9Fc"},
  {id:1418,name:"Sasithorn T",yt:"https://www.youtube.com/watch?v=G7IVBt_mWmw"},
  {id:1417,name:"Khwanta",yt:"https://www.youtube.com/watch?v=e6guOKilXJs"},
  {id:1416,name:"Nanthaphat",yt:"https://www.youtube.com/watch?v=Ocrd7J1Imv8"},
  {id:1415,name:"Panicha",yt:"https://www.youtube.com/watch?v=o2XM55o-GvI"},
  {id:1414,name:"Sunisa",yt:"https://www.youtube.com/watch?v=AzaajnwCLvI"},
  {id:1413,name:"Nora",yt:"https://www.youtube.com/watch?v=HOIqkJ1bH0I"},
  {id:1412,name:"Tik",yt:"https://www.youtube.com/watch?v=fiwh-Fe-yfI"},
  {id:1411,name:"Bualee",yt:"https://www.youtube.com/watch?v=AaVCTjQ_eo4"},
  {id:1410,name:"Anchalee K.",yt:"https://www.youtube.com/watch?v=dYprrikytc0"},
  {id:1408,name:"Pimchayapat",yt:"https://www.youtube.com/watch?v=A-bzOMvtXVU"},
  {id:1407,name:"Titiya",yt:"https://www.youtube.com/watch?v=mXRsvZH7IM0"},
  {id:1405,name:"Sasamon",yt:"https://www.youtube.com/watch?v=LIUkhezseK4"},
  {id:1404,name:"Supattra P.",yt:"https://www.youtube.com/watch?v=gGvR9lJXByU"},
  {id:1403,name:"Nongpen",yt:"https://www.youtube.com/watch?v=MAaAXRkrYaU"},
  {id:1402,name:"Maneerattana",yt:"https://www.youtube.com/watch?v=vmsWFxqVX14"},
  {id:1401,name:"Bussara",yt:"https://www.youtube.com/watch?v=NlPUtJteKEM"},
  {id:1400,name:"Sasiorn",yt:"https://www.youtube.com/watch?v=3LPTsYBbA2A"},
  {id:1399,name:"Phaphimon",yt:"https://www.youtube.com/watch?v=8TizA6Y-qqk"},
  {id:1398,name:"Wipawee",yt:"https://www.youtube.com/watch?v=DhDAkmnl7WA"},
  {id:1397,name:"Pawanrad Yeamsuntiawong",yt:"https://www.youtube.com/watch?v=VkvQ-wOsL-k"},
  {id:1395,name:"Chirapha",yt:"https://www.youtube.com/watch?v=jztWoiTHMLg"},
  {id:1394,name:"Duangkamol",yt:"https://www.youtube.com/watch?v=t4jl5yt7_tI"},
  {id:1393,name:"Rattikan",yt:"https://www.youtube.com/watch?v=8VbuWk6jNhs"},
  {id:1391,name:"Janthra",yt:"https://www.youtube.com/watch?v=G3TNTr0Qh-o"},
  {id:1389,name:"Churairat",yt:"https://www.youtube.com/watch?v=O0guVhqfYgQ"},
  {id:1388,name:"Rinrada",yt:"https://www.youtube.com/watch?v=XVhHGyyItBQ"},
  {id:1387,name:"Natphimon",yt:"https://www.youtube.com/watch?v=Ba1jVTd_19Q"},
  {id:1386,name:"Kotchaphon",yt:"https://www.youtube.com/watch?v=JUt2GoTYJ_U"},
  {id:1385,name:"Natrada Charoensin",yt:"https://www.youtube.com/watch?v=Muxnx2EaT5I"},
  {id:1384,name:"Pawarisa",yt:"https://www.youtube.com/watch?v=Im6hTb4lOos"},
  {id:1382,name:"Pornsinee",yt:"https://www.youtube.com/watch?v=rqy-khxYd3Y"},
  {id:1380,name:"Yurin Inlee",yt:"https://www.youtube.com/watch?v=IK_SSSLmkiI"},
  {id:1379,name:"Kanokpich",yt:"https://www.youtube.com/watch?v=kh0dL7bRPSw"},
  {id:1378,name:"Jindaporn",yt:"https://www.youtube.com/watch?v=RsFtoSRhZ9o"},
  {id:1377,name:"Tapanee",yt:"https://www.youtube.com/watch?v=PMTnqnC86RE"},
  {id:1376,name:"Anutida",yt:"https://www.youtube.com/watch?v=3X2DXFW4jk8"},
  {id:1374,name:"Thanjira",yt:"https://www.youtube.com/watch?v=rDRdZucX1TE"},
  {id:1373,name:"Pajaree",yt:"https://www.youtube.com/watch?v=BTq4UrAmlXI"},
  {id:1372,name:"Siriphon",yt:"https://www.youtube.com/watch?v=3yY9Uixyla4"},
  {id:1371,name:"Lalichat",yt:"https://www.youtube.com/watch?v=YS-9RuuXK4Y"},
  {id:1370,name:"Phisarinthan",yt:"https://www.youtube.com/watch?v=STrHK6oJhqM"},
  {id:1366,name:"Saengarun",yt:"https://www.youtube.com/watch?v=_6_Xp0TQ18E"},
  {id:1365,name:"Rasminah Rasminah",yt:"https://www.youtube.com/watch?v=xq9pz8CqCJU"},
  {id:1364,name:"Arthanya",yt:"https://www.youtube.com/watch?v=zXk9zcNZZ5g"},
  {id:1363,name:"Nannapha",yt:"https://www.youtube.com/watch?v=5F3srPSp834"},
  {id:1361,name:"Wiranya",yt:"https://www.youtube.com/watch?v=JULo0q28zDo"},
  {id:1358,name:"Phatthanan Charoenkunwapan",yt:"https://www.youtube.com/watch?v=ro3uZzppj4E"},
  {id:1357,name:"Pacharapat",yt:"https://www.youtube.com/watch?v=g8T2qILc-KA"},
  {id:1355,name:"Thitikayy Promta",yt:"https://www.youtube.com/watch?v=urvVi4Pcb5c"},
  {id:1351,name:"Warunee",yt:"https://www.youtube.com/watch?v=17bjRhnd20Y"},
  {id:1350,name:"Chutimon",yt:"https://www.youtube.com/watch?v=fzUBCUOqxXc"},
  {id:1349,name:"Nattha Wongchompoo",yt:"https://www.youtube.com/watch?v=GL7cdeMW0_c"},
  {id:1348,name:"Arisa",yt:"https://www.youtube.com/watch?v=faVOzsjKs8g"},
  {id:1347,name:"Phanida",yt:"https://www.youtube.com/watch?v=U5ZIJmcJDoc"},
  {id:1345,name:"Tukta",yt:"https://www.youtube.com/watch?v=TJ5tgyo080I"},
  {id:1344,name:"Panisara",yt:"https://www.youtube.com/watch?v=omIgpOD5fu4"},
  {id:1342,name:"Sirinvaree Lertsansuksiri",yt:"https://www.youtube.com/watch?v=llTnVNzAyjM"},
  {id:1341,name:"Prapussorn",yt:"https://www.youtube.com/watch?v=3MaxmQkBhf0"},
  {id:1334,name:"Sansanee",yt:"https://www.youtube.com/watch?v=YdmUKGdGcCo"},
  {id:1333,name:"Pussadee",yt:"https://www.youtube.com/watch?v=ZCyBcIuedCY"},
  {id:1328,name:"Tiwaphon",yt:"https://www.youtube.com/watch?v=xnB7OEJCsA4"},
  {id:1325,name:"Srisuda",yt:"https://www.youtube.com/watch?v=hqxiYr6vziw"},
  {id:1324,name:"Arunrat",yt:"https://www.youtube.com/watch?v=DznAcyH9pcc"},
  {id:1323,name:"Ratsami",yt:"https://www.youtube.com/watch?v=jmNHsD7hgVM"},
  {id:1321,name:"Warunee",yt:"https://www.youtube.com/watch?v=5KHsoUppjgI"},
  {id:1319,name:"Nantana",yt:"https://www.youtube.com/watch?v=gUUN6ORw_ow"},
  {id:1318,name:"Naritha",yt:"https://www.youtube.com/watch?v=bCF2bJgKaJk"},
  {id:1316,name:"Molchita",yt:"https://www.youtube.com/watch?v=saOZZaiSWBo"},
  {id:1301,name:"Rattanaporn",yt:"https://www.youtube.com/watch?v=tBRixkJOtJ8"},
  {id:1286,name:"Phitchakorn",yt:"https://www.youtube.com/watch?v=nVidQOhsJ2g"},
  {id:1285,name:"Phonpimol",yt:"https://www.youtube.com/watch?v=egOBWqRcEaQ"},
  {id:1268,name:"Yanika",yt:"https://www.youtube.com/watch?v=NwUAsCcAjFs"},
  {id:1267,name:"Uraiwan",yt:"https://www.youtube.com/watch?v=u6bsykhW3aQ"},
  {id:1263,name:"Prapawadee",yt:"https://www.youtube.com/watch?v=yfPOF0lcxR0"},
  {id:1259,name:"Chutima Phattarapankoson",yt:"https://www.youtube.com/watch?v=4etdLAjh7Vw"},
  {id:1257,name:"Hathairat",yt:"https://www.youtube.com/watch?v=7DnlmN2LxEE"},
  {id:1256,name:"Nattachai",yt:"https://www.youtube.com/watch?v=JonFCf4wttM"},
  {id:1246,name:"Panjarat",yt:"https://www.youtube.com/watch?v=ZuS3lp_GtHU"},
  {id:1242,name:"Montita",yt:"https://www.youtube.com/watch?v=FDqpbwMR3Tw"},
  {id:1236,name:"Muthita",yt:"https://www.youtube.com/watch?v=q21g7MjAfqQ"},
  {id:1220,name:"Jilawan",yt:"https://www.youtube.com/watch?v=4f9Mcz1c5yQ"},
  {id:1214,name:"Maria A.H Noya",yt:"https://www.youtube.com/watch?v=l7sdUnDySPA"},
  {id:1212,name:"Jinnarat Prommeerachin",yt:"https://www.youtube.com/watch?v=XDdgxyWP2DA"},
  {id:1210,name:"Phonphat Rattimon",yt:"https://www.youtube.com/watch?v=6M2nDX8m17E"},
  {id:1205,name:"Ni Luh Adiasih",yt:"https://www.youtube.com/watch?v=Q11LcxwzadY"},
  {id:1204,name:"Jiranan Somsuai",yt:"https://www.youtube.com/watch?v=5206yo-9Dl8"},
  {id:1202,name:"Yospol Yosmadee",yt:"https://www.youtube.com/watch?v=lBFr1pJSdIQ"},
  {id:1201,name:"Wayan Endang Yuliawati",yt:"https://www.youtube.com/watch?v=9SZi_fUATLY"},
  {id:1198,name:"Gusti Ayu Sumenasih",yt:"https://www.youtube.com/watch?v=GDcDx5SbrrA"},
  {id:1197,name:"Chanpen",yt:"https://www.youtube.com/watch?v=4gWg2GMk08Y"},
  {id:1195,name:"Kanokwan Longna",yt:"https://www.youtube.com/watch?v=o9ni2P7XLOY"},
  {id:1194,name:"Kanjana Leephon",yt:"https://www.youtube.com/watch?v=IwUxINKuP8s"},
  {id:1193,name:"Khamkaew",yt:"https://www.youtube.com/watch?v=K3DZuOLZMLQ"},
  {id:1192,name:"Sornsawan",yt:"https://www.youtube.com/watch?v=MAdu3hkHbqQ"},
  {id:1189,name:"Runglawan",yt:"https://www.youtube.com/watch?v=dEwZV9iZo1w"},
  {id:1187,name:"Suphachchay Khaemyaem",yt:"https://www.youtube.com/watch?v=1GxX2jp5xtw"},
  {id:1185,name:"Ladda Kromthamma",yt:"https://www.youtube.com/watch?v=Ir8W7VnBbgE"},
  {id:1184,name:"Thanyarat Sukruksa",yt:"https://www.youtube.com/watch?v=ZjgkS5v11Cg"},
  {id:1182,name:"KRITCHAPHAT",yt:"https://www.youtube.com/watch?v=PUDo7X8GLz4"},
  {id:1181,name:"Chawanrath",yt:"https://www.youtube.com/watch?v=khibMMv5v5c"},
  {id:1180,name:"Ertin Susanti",yt:"https://www.youtube.com/watch?v=Sozr-gRftRU"},
  {id:1179,name:"I Dewa Ayu Komang Satria Dewi",yt:"https://www.youtube.com/watch?v=NCZoUMy7CgM"},
  {id:1177,name:"Angelika Marlisandhy",yt:"https://www.youtube.com/shorts/rW3FYLv8Yes"},
  {id:1176,name:"Jirapan",yt:"https://www.youtube.com/watch?v=ujV0mTECVjI"},
  {id:1175,name:"Chanasin Sihom",yt:"https://www.youtube.com/watch?v=Pmacm0TZMkE"},
  {id:1152,name:"Ni Wayan Antini",yt:"https://www.youtube.com/watch?v=jeAay3pueHc"},
  {id:1151,name:"Citra Purnamasari",yt:"https://youtube.com/shorts/1kZ37G6P0Nw"},
  {id:1149,name:"Jiraphat Nunthasuk",yt:"https://www.youtube.com/watch?v=dDyN7IF0cz8"},
  {id:1148,name:"Worakamon Piwkam",yt:"https://www.youtube.com/watch?v=H56F86AlqK4"},
  {id:1145,name:"Prapai",yt:"https://www.youtube.com/watch?v=Nun4jtzPB5k"},
  {id:1143,name:"Riza Umami",yt:"https://www.youtube.com/watch?v=noR3KL_AWng"},
  {id:1142,name:"Saowalak Kokaeo",yt:"https://www.youtube.com/watch?v=VyNG4A9rkV0"},
  {id:1141,name:"Urarat Choemklang",yt:"https://www.youtube.com/watch?v=CY0KK1T2Pmo"},
  {id:1140,name:"Jantra Sawangdee",yt:"https://www.youtube.com/watch?v=2kXVZM6t97Y"},
  {id:1139,name:"Ratna Karmila",yt:"https://www.youtube.com/watch?v=400A9j0qNwk"},
  {id:1137,name:"Naree Somthawin",yt:"https://www.youtube.com/watch?v=Vw0VSNBNwMg"},
  {id:1135,name:"Darunee Polyiam",yt:"https://www.youtube.com/watch?v=t1ri0yly4Kw"},
  {id:1134,name:"Siriphen Nakpin",yt:"https://www.youtube.com/watch?v=jp3hagNaLsw"},
  {id:1132,name:"Punyanuch Phuditsirikul",yt:"https://www.youtube.com/watch?v=z2BHjn4_r6M"},
  {id:1131,name:"Rattika Nookui",yt:"https://www.youtube.com/watch?v=LqY73Sh7_aw"},
  {id:1130,name:"Chanwara Phegnkrajang",yt:"https://www.youtube.com/watch?v=P3FpIa3F07Y"},
  {id:1129,name:"Sairung Sakhoem",yt:"https://www.youtube.com/watch?v=rA4RoGqcfys"},
  {id:1128,name:"Phonnicha Hanchana",yt:"https://www.youtube.com/watch?v=DkOVfup9TGs"},
  {id:1127,name:"Ni Nyoman Sudiasih",yt:"https://www.youtube.com/watch?v=4AkoDUw0CDg"},
  {id:1126,name:"Ni Komang Suartini",yt:"https://www.youtube.com/watch?v=AJIa3j_sxSQ"},
  {id:1125,name:"Jenni",yt:"https://www.youtube.com/watch?v=hP4hAJQ4Dio"},
  {id:1123,name:"Titapat Patthum",yt:"https://www.youtube.com/watch?v=sBXnD2xve_8"},
  {id:1122,name:"Disyamon Nettubtim",yt:"https://www.youtube.com/watch?v=htoFlxh6VrU"},
  {id:1121,name:"Sumonrat Kitiyapinan",yt:"https://www.youtube.com/watch?v=d6i2CysU4JY"},
  {id:1119,name:"Anusara Khongkeawpan",yt:"https://www.youtube.com/watch?v=FaxjK0If_Js"},
  {id:1117,name:"sutharinee",yt:"https://www.youtube.com/watch?v=szwpMMT0xmk"},
  {id:1115,name:"Wachira Dorfling",yt:"https://www.youtube.com/watch?v=i2nH1_rArmk"},
  {id:1114,name:"Manit",yt:"https://www.youtube.com/watch?v=ZZKyPJ67Swg"},
  {id:1113,name:"Wannarot",yt:"https://www.youtube.com/watch?v=vBGM3NDJkxg"},
  {id:1112,name:"Sasithorn",yt:"https://www.youtube.com/watch?v=mNAuAZr7c8A"},
  {id:1111,name:"Nattasinee",yt:"https://www.youtube.com/watch?v=SiRocXjiQNU"},
  {id:1110,name:"Onanuma",yt:"https://www.youtube.com/watch?v=VDRoJM-9m3Y"},
  {id:1109,name:"Sarirush",yt:"https://www.youtube.com/watch?v=ZbQFgJNyccM"},
  {id:1108,name:"Kusuma",yt:"https://www.youtube.com/watch?v=wYO6_sEGF6o"},
  {id:1107,name:"Pirada",yt:"https://www.youtube.com/watch?v=jxYBuBGjBVk"},
  {id:1106,name:"Chanantiya",yt:"https://www.youtube.com/watch?v=zq1id0g-9vY"},
  {id:1105,name:"Srisurang",yt:"https://www.youtube.com/watch?v=_zggEzbzFCU"},
  {id:1104,name:"Kodchakorn",yt:"https://www.youtube.com/watch?v=4ugFUmZ6MgQ"},
  {id:1103,name:"Rosarin Wannakam",yt:"https://www.youtube.com/watch?v=s44P_RLIVEA"},
  {id:1101,name:"Padiworrada",yt:"https://www.youtube.com/watch?v=zVoObV4SZkI"},
  {id:1100,name:"Oudomluk",yt:"https://www.youtube.com/watch?v=poNKXgJYzMI"},
  {id:1099,name:"Arunee",yt:"https://www.youtube.com/watch?v=rfMzkHPS8ao"},
  {id:1098,name:"Srisomboon",yt:"https://www.youtube.com/watch?v=_GF48xmbrfs"},
  {id:1097,name:"Thitipa",yt:"https://www.youtube.com/watch?v=S-r1b-hhkTU"},
  {id:1096,name:"Woradi",yt:"https://www.youtube.com/watch?v=kvzKnJjNZt0"},
  {id:1095,name:"Rawikan",yt:"https://www.youtube.com/watch?v=yIuKd2MTeRc"},
  {id:1094,name:"Rattya Inplang",yt:"https://www.youtube.com/watch?v=lHNHhEUnr4Q"},
  {id:1093,name:"Ploychomphu Tanruang",yt:"https://www.youtube.com/watch?v=wP4QbYBESCw"},
  {id:1092,name:"Kanokporn Khulee",yt:"https://www.youtube.com/watch?v=1mZ3eLbLaQQ"},
  {id:1090,name:"Banthita",yt:"https://www.youtube.com/watch?v=PkF2-rcudTc"},
  {id:1089,name:"Kanokon Poochamchod",yt:"https://www.youtube.com/watch?v=CsCRP6jjnMk"},
  {id:1088,name:"Varanpach Sattayawan",yt:"https://www.youtube.com/watch?v=nM9Kt9yFDmY"},
  {id:1083,name:"Prapai Praneewong",yt:"https://www.youtube.com/shorts/qJfsg3F48Z8"},
  {id:1081,name:"Saruda",yt:"https://www.youtube.com/watch?v=tYqkzw6Q5sk"},
  {id:1080,name:"Siriwan",yt:"https://www.youtube.com/watch?v=m_AVsfJSvCc"},
  {id:1079,name:"Jiranan Khrueaphan",yt:"https://www.youtube.com/watch?v=bGGjH79-u_Y"},
  {id:1078,name:"Chanapha Khrueaphan",yt:"https://www.youtube.com/watch?v=p-sHUORK1Qg"},
  {id:1077,name:"Phisan Ranghan",yt:"https://www.youtube.com/watch?v=7YbW98sLiSI"},
  {id:1076,name:"Kethkanthika",yt:"https://www.youtube.com/watch?v=Li51VFBpE58"},
  {id:1075,name:"Kunruthai",yt:"https://www.youtube.com/watch?v=2NhcZAvj570"},
  {id:1074,name:"Prakairat",yt:"https://www.youtube.com/watch?v=qKn3WJ5eWt0"},
  {id:1073,name:"Woranet Chaingnara",yt:"https://www.youtube.com/watch?v=tTdkty8THDE"},
  {id:1072,name:"Phakpho",yt:"https://www.youtube.com/watch?v=izNcsOslE44"},
  {id:1071,name:"Wilailak",yt:"https://www.youtube.com/watch?v=GMAXNJO_3Kk"},
  {id:1069,name:"Mayuree",yt:"https://www.youtube.com/watch?v=oWx9e2ktOLM"},
  {id:1068,name:"Suphawadee Pow",yt:"https://www.youtube.com/watch?v=h81r0sW6v6M"},
  {id:1067,name:"Pawinee",yt:"https://www.youtube.com/watch?v=ko-6gLffbg8"},
  {id:1066,name:"Miaw Jutarat",yt:"https://www.youtube.com/watch?v=gr-ymH9wFXM"},
  {id:1065,name:"Chanisara Sareekij",yt:"https://www.youtube.com/watch?v=et_y7LR6_Yk"},
  {id:1064,name:"Thanyalak Oh",yt:"https://www.youtube.com/watch?v=G4UQTGiWs4o"},
  {id:1063,name:"Yosita",yt:"https://www.youtube.com/watch?v=A7a1qLiktAo"},
  {id:1062,name:"Siriporn Air",yt:"https://www.youtube.com/watch?v=LNhg5XJ-Mcc"},
  {id:1061,name:"Thanyaphat ya",yt:"https://www.youtube.com/watch?v=BebjjOrNHE4"},
  {id:1060,name:"Tippawan",yt:"https://www.youtube.com/watch?v=JxT3SrkRClE"},
  {id:1059,name:"Pannakon Martinez",yt:"https://www.youtube.com/watch?v=0OQ_VJaJ5oo"},
  {id:1058,name:"Chalanthorn",yt:"https://www.youtube.com/watch?v=eaxF4HmP85Y"},
  {id:1057,name:"Laddawan Da",yt:"https://www.youtube.com/watch?v=uc7_ORSQM9s"},
  {id:1056,name:"Mayura",yt:"https://www.youtube.com/watch?v=EQ3qveFwqtM"},
  {id:1055,name:"Rasamee May",yt:"https://www.youtube.com/watch?v=GTEXsMOqudY"},
  {id:1054,name:"Tasanee",yt:"https://www.youtube.com/watch?v=uHQd0Hdipd0"},
  {id:1053,name:"Kanyapath",yt:"https://www.youtube.com/watch?v=VEJ6X8oGh-0"},
  {id:1052,name:"Inthira A",yt:"https://www.youtube.com/watch?v=9x61ZgJrHB8"},
  {id:1050,name:"Pream Laphitsara",yt:"https://youtu.be/_v7dtN2AZc8"},
  {id:1045,name:"Supattra Niantaisong",yt:"https://www.youtube.com/watch?v=W0b5qFPAfS4"},
  {id:1044,name:"Ratree Sedtha",yt:"https://www.youtube.com/watch?v=K-J9GEXt-LY"},
  {id:1043,name:"Jidapa Paisan",yt:"https://www.youtube.com/watch?v=LQAu_TqpIkY"},
  {id:1042,name:"Suchada Nokngam",yt:"https://www.youtube.com/watch?v=1KImckqWkL0"},
  {id:1041,name:"Wipaporn Taintha",yt:"https://www.youtube.com/watch?v=xlVbzvkVgbU"},
  {id:1040,name:"Thapthim Futui",yt:"https://www.youtube.com/watch?v=crKJLzL4du0"},
  {id:1039,name:"Palita Wijitanon",yt:"https://www.youtube.com/watch?v=8ruqEEVl3Bc"},
  {id:1038,name:"Jiraporn Weruwanarak",yt:"https://www.youtube.com/watch?v=XHYFxrIjL2I"},
  {id:1037,name:"Ratchanee Butvicha",yt:"https://www.youtube.com/watch?v=WKjbe0btSEU"},
  {id:1036,name:"Natthaphat Ariyabaraneekool",yt:"https://www.youtube.com/watch?v=fCP07IQHKzo"},
  {id:1034,name:"Ganogvan Dampan",yt:"https://www.youtube.com/watch?v=iPPOkKP1GQ4"},
  {id:1033,name:"Thiwachat Songkot",yt:"https://www.youtube.com/watch?v=WB5eGg4P3Fc"},
  {id:1032,name:"Anchayaporn Sanit",yt:"https://www.youtube.com/watch?v=KHMCRbQmNeI"},
  {id:1031,name:"Darunee Namboonma",yt:"https://www.youtube.com/watch?v=HHB8rnSMo_Q"},
  {id:1030,name:"Pornphailin Nadee",yt:"https://www.youtube.com/watch?v=jkPkJnePE_Y"},
  {id:1029,name:"Nadsagolpad Wannaratn",yt:"https://www.youtube.com/watch?v=oNUJp0SZcF8"},
  {id:1028,name:"Pimtaneya Wongsurin",yt:"https://www.youtube.com/watch?v=ssc4kQTxmdE"},
  {id:1027,name:"Suphawee Harnsuek",yt:"https://www.youtube.com/watch?v=PwWcsPGU2HQ"},
  {id:1026,name:"Chalita Oappakan",yt:"https://www.youtube.com/watch?v=wIO_aCQbvBs"},
  {id:1025,name:"Sopha Chanthasri",yt:"https://www.youtube.com/watch?v=fIGAMO8Qe6o"},
  {id:1024,name:"Tok Saengchan",yt:"https://www.youtube.com/watch?v=70_LuL0YLXw"},
  {id:1023,name:"Pimthong Surarueangchai",yt:"https://www.youtube.com/watch?v=tdGPVLLSWHA"},
  {id:1022,name:"Yuthita",yt:"https://www.youtube.com/watch?v=NWAy0bYxUIc"},
  {id:1021,name:"Ampaiwan Promsorn",yt:"https://www.youtube.com/watch?v=Q1iele925nc"},
  {id:1020,name:"Kanokporn Mataya",yt:"https://www.youtube.com/watch?v=6Y4iNGAQO7o"},
  {id:1019,name:"Patcharee Srisopa",yt:"https://www.youtube.com/watch?v=A84PSi-VXLI"},
  {id:1017,name:"Chonlaya Chanraem",yt:"https://www.youtube.com/watch?v=aWqXVioAwMI"},
  {id:1016,name:"Natsaran Panadit",yt:"https://www.youtube.com/watch?v=FMQqUjhxgdA"},
  {id:1015,name:"Phichanut Chanhom",yt:"https://www.youtube.com/watch?v=nyfK8ScZUCU"},
  {id:1014,name:"Araya Yasomsri",yt:"https://www.youtube.com/watch?v=oj88WUaF0t8"},
  {id:1013,name:"Ammarin Klongnawa",yt:"https://www.youtube.com/watch?v=xhNJh2PVVbA"},
  {id:1012,name:"Ravinwarakan Cheangman",yt:"https://www.youtube.com/watch?v=sXCucZ-IAeo"},
  {id:1011,name:"Tarntip Pilakeao",yt:"https://www.youtube.com/watch?v=-L0ro-WJOHw"},
  {id:1008,name:"Thanaporn Authawong",yt:"https://www.youtube.com/watch?v=4Qf0f3_2gKA"},
  {id:1007,name:"Jantana Kumpouk",yt:"https://www.youtube.com/watch?v=qKi0nYhgCmc"},
  {id:1006,name:"Supaporn Jampeekang",yt:"https://www.youtube.com/watch?v=GABFlOouHrg"},
  {id:1005,name:"Jongkolnee Phongpilar",yt:"https://www.youtube.com/watch?v=5G8c3ZgFl2E"},
  {id:1000,name:"Wanarudee Wannasan",yt:"https://www.youtube.com/watch?v=OVoYGhbHJ98"},
];

const BASE = 'https://spa-company.com/therapist/?id=';

function parseProfile(html, t) {
  const root = parse(html);
  const text = (sel) => root.querySelector(sel)?.text?.trim() || '';

  // Try to extract age from page text
  const ageMatch = html.match(/(\d{2,3})\s*(?:Years?|years?|yrs)/i);
  const age = ageMatch ? parseInt(ageMatch[1]) : 0;

  // Gender
  const genderMatch = html.match(/(?:Gender|Sex)\s*:?\s*(Female|Male)/i);
  const gender = genderMatch ? genderMatch[1] : 'Female';

  // Location
  const locationMatch = html.match(/(?:Location|Province|City)\s*:?\s*([A-Za-z\s]+?)(?:\s*<|,|\n)/i);
  const location = locationMatch ? locationMatch[1].trim() : 'Thailand';

  // Desired work location
  const desiredMatch = html.match(/(?:Desired|Want|Preferred).*?(?:Location|Country|Destination)\s*:?\s*([A-Za-z\s,]+?)(?:\s*<|\n)/i);
  const desiredWorkLocation = desiredMatch ? desiredMatch[1].trim() : '';

  // Skills - look for known massage types
  const knownSkills = [
    'Aroma Massage','Body Massage','Deep Tissue Massage','Facial Massage',
    'Foot Massage','Foot Reflexology','Foot Spa','Herbal Massage',
    'Hot Stone Massage','Oil Massage','Scrub Massage','Slimming Massage',
    'Thai Foot Spa and Massage','Traditional Thai Massage','Herbal Compress',
    'Body Scrub','Bamboo Massage','Body & Foot Scrub','Herbal Compress',
    'Thai Herbal Compress Massage'
  ];
  const skills = knownSkills.filter(s => html.includes(s));

  // Rating scores — old site format: <div class="section_headline">Communication</div>...<span>13<br><span class="mb_of">of 20</span>
  const ratingKeys = ['Communication','Appearance','Pro Activity','Experience','Massage Skills'];
  const ratings = { communication: 0, appearance: 0, proactivity: 0, experience: 0, massageSkills: 0 };
  for (const key of ratingKeys) {
    const m = html.match(new RegExp('section_headline">\\s*' + key + '\\s*<\\/div>[\\s\\S]*?<span>(\\d{1,2})<br', 'i'));
    if (m) {
      const fieldKey = key === 'Pro Activity' ? 'proactivity' : key === 'Massage Skills' ? 'massageSkills' : key.toLowerCase();
      ratings[fieldKey] = parseInt(m[1]);
    }
  }

  // Bio/About - look for paragraph after "About" section
  const bioMatch = html.match(/(?:class="mb_about_text"|About\s*<\/h[23]>)\s*(?:<[^>]+>)*\s*<p>([\s\S]*?)<\/p>/i);
  const bio = bioMatch ? bioMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Photos
  const photoMatches = [...html.matchAll(/src="(https:\/\/spa-company\.com\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png))"/gi)];
  const photos = [...new Set(photoMatches.map(m => m[1]))].filter(p => !p.includes('150x150') && !p.includes('Logo') && !p.includes('visa-group'));

  // Experience - try to extract years
  const expMatch = html.match(/(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|work)/i);
  const experience = expMatch ? parseInt(expMatch[1]) : 0;

  return {
    name: t.name,
    age,
    gender,
    location,
    experience,
    desiredWorkLocation,
    skills: skills.length > 0 ? skills : ['Traditional Thai Massage'],
    bio: bio || `${t.name} is a verified Thai massage therapist registered with Spa Company Bangkok.`,
    ratings,
    workHistory: [],
    photos: photos.slice(0, 7),
    youtubeUrl: t.yt,
    status: 'active',
    wpUserId: t.id,
  };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function importAll() {
  // Check which wpUserIds already exist
  const existing = new Set();
  const snap = await getDocs(collection(db, 'therapists'));
  for (const d of snap.docs) {
    if (d.data().wpUserId) existing.add(d.data().wpUserId);
  }
  console.log(`${existing.size} profiles already in Firestore, skipping duplicates.\n`);

  let imported = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < therapists.length; i++) {
    const t = therapists[i];

    if (existing.has(t.id)) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch(BASE + t.id);
      if (!res.ok) { console.log(`  SKIP ${t.id} ${t.name} — HTTP ${res.status}`); failed++; continue; }
      const html = await res.text();

      const profile = parseProfile(html, t);
      const docRef = await addDoc(collection(db, 'therapists'), {
        ...profile,
        createdAt: serverTimestamp(),
      });

      imported++;
      console.log(`[${imported}] ${t.id} ${t.name} → ${docRef.id} (${profile.skills.length} skills, ${profile.photos.length} photos, age:${profile.age})`);

      // Rate limit: 200ms between requests
      await sleep(200);
    } catch (err) {
      console.log(`  FAIL ${t.id} ${t.name}: ${err.message}`);
      failed++;
    }

    // Progress every 50
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${therapists.length} processed, ${imported} imported, ${failed} failed, ${skipped} skipped ---\n`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (already existed): ${skipped}`);
  console.log(`Total in list: ${therapists.length}`);
  process.exit(0);
}

importAll().catch(err => { console.error(err); process.exit(1); });
