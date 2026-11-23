// Todo lo configurable vive aquí. Para probar rápido, baja VIGENCIA_S y ESPERA_MAX_S.
export const CFG = { VIGENCIA_S: 300, ESPERA_MAX_S: 180, RESP_MIN_S: 3, RESP_MAX_S: 10, CIERRE: '6:30 pm', MANUAL: 'scarlett', CAP: 5, MAX_PROD: 5, MAX_ORDEN: 10, CARGO_CANC: 0.5 };
export const NEG = [
  { id: 'scarlett', nombre: "Scarlett's", sub: 'Aqua Foodies · Mariscos', estado: 'abierto', entrega: 'Puntual', menu: [
    { id: 'sushi', nombre: 'Sushi', min: 20, precio: 95 }, { id: 'yaki', nombre: 'Yakimeshi', min: 30, precio: 85 },
    { id: 'ramen', nombre: 'Ramen', min: 35, precio: 100 }, { id: 'pez', nombre: 'Pez escarlata', min: 25, precio: 130, agotado: true }] },
  { id: 'maxine', nombre: "Maxine's Goodies", sub: 'Tiendita', estado: 'abierto', entrega: 'Puntual', menu: [
    { id: 'soda', nombre: 'Soda', min: 1, precio: 20 }, { id: 'sabritas', nombre: 'Sabritas sal', min: 1, precio: 22 }, { id: 'agua', nombre: 'Agua natural', min: 1, precio: 15 }] },
  { id: 'wamy', nombre: "Wamy's", sub: 'Cafetería', estado: 'pausado', entrega: 'Puntual', menu: [
    { id: 'cafe', nombre: 'Café americano', min: 5, precio: 35 }, { id: 'sandwich', nombre: 'Sándwich', min: 10, precio: 55 }] },
  { id: 'remy', nombre: 'Remy Treats', sub: 'Postres y pocos más', estado: 'abierto', entrega: 'Un poco tarde', menu: [
    { id: 'choux', nombre: 'Choux', min: 5, precio: 65 }, { id: 'brownie', nombre: 'Brownie', min: 3, precio: 55 }] }
];
export const METODOS = ['Crédito de la facultad', 'Tarjeta de débito', 'Pagado a meses', 'Pago en efectivo'];
export const CLIENTE = { nombre: 'Maxine Roux', edad: 17, cuenta: '20137086', facultad: 'Facultad de Telemática', carrera: 'Ingeniería de Software' };
export const HORAS = ['3:30 pm', '4:00 pm', '4:30 pm', '5:00 pm', '5:15 pm', '5:30 pm'];
export const neg = id => NEG.find(n => n.id === id);
