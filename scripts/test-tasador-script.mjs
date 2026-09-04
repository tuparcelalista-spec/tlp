import handler from './api/tasador.js';

const req = {
  method: 'POST',
  body: {
    comuna: 'negrete',
    superficie: 5000,
    majorCityDistanceKm: 35, 
    nature: ['rio vergara'],
    rol: 'rol propio'
  }
};

const res = {
  status: function(code) { 
    this.statusCode = code; 
    return this; 
  },
  json: function(data) { 
    console.log(JSON.stringify(data, null, 2)); 
    return this; 
  },
  end: function() {}
};

handler(req, res);
