
window.requestAnimFrame = function () {
  return window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  function (callback) {
    window.setTimeout(callback, 1000 / 60);
  };
}();

// variables básicas
var canvas = document.getElementById('canvas'),
ctx = canvas.getContext('2d'),
// dimensiones de pantalla completa
cw = window.innerWidth,
ch = window.innerHeight,
// colección de fuegos artificiales
fireworks = [],
// colección de partículas
particles = [],
// tono inicial
hue = 120,
//cuando se lanzan fuegos artificiales con un clic, se lanzan demasiados a la vez sin un limitador, un lanzamiento por cada 5 
limiterTotal = 5,
limiterTick = 0,
//  esto medirá el tiempo de los lanzamientos automáticos de fuegos artificiales, un lanzamiento por cada 80 tics de bucle
timerTotal = 80,
timerTick = 0,
mousedown = false,
// coordenada x del ratón
mx,
// coordenada y del ratón
my;

// dimensiones del lienzo
canvas.width = cw;
canvas.height = ch;

// configuracion de marcadores de posición de función

//  obtener un número aleatorio dentro de un rango
function random(min, max) {
  return Math.random() * (max - min) + min;
}

// calcular la distancia entre dos puntos
function calculateDistance(p1x, p1y, p2x, p2y) {
  var xDistance = p1x - p2x,
  yDistance = p1y - p2y;
  return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// crear fuegos artificiales
function Firework(sx, sy, tx, ty) {
  // cordenadas reales
  this.x = sx;
  this.y = sy;
  // cordenadas iniciales
  this.sx = sx;
  this.sy = sy;
  // cordenadas del objetivo
  this.tx = tx;
  this.ty = ty;
  // distancia desde el punto de partida hasta el objetivo
  this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
  this.distanceTraveled = 0;
  // rastrea las coordenadas pasadas de cada fuego artificial para crear un efecto de estela, aumenta el conteo de coordenadas 
  this.coordinates = [];
  this.coordinateCount = 3;
  // rellenar la colección de coordenadas inicial con las coordenadas actuales
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  this.angle = Math.atan2(ty - sy, tx - sx);
  this.speed = 2;
  this.acceleration = 1.05;
  this.brightness = random(50, 70);
  // círculo objetivo indicador radio
  this.targetRadius = 1;
}

// actualizar fuegos artificiales
Firework.prototype.update = function (index) {
  // elimina el último elemento en la matriz de coordenadas
  this.coordinates.pop();
  // agrega las coordenadas actuales al inicio de la matriz
  this.coordinates.unshift([this.x, this.y]);

  // ciclar el radio del indicador de destino del círculo
  if (this.targetRadius < 8) {
    this.targetRadius += 0.3;
  } else {
    this.targetRadius = 1;
  }

  // acelerar los fuegos artificiales
  this.speed *= this.acceleration;

  // obtener las velocidades actuales en función del ángulo y la velocidad
  var vx = Math.cos(this.angle) * this.speed,
  vy = Math.sin(this.angle) * this.speed;
  // ¿Qué tan lejos habrán viajado los fuegos artificiales con las velocidades aplicadas?
  this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

  // si la distancia recorrida, incluidas las velocidades, es mayor que la distancia inicial al objetivo, entonces se ha alcanzado el objetivo
  if (this.distanceTraveled >= this.distanceToTarget) {
    createParticles(this.tx, this.ty);
    // elimina los fuegos artificiales, usa el índice pasado a la función de actualización para determinar cuál eliminar
    fireworks.splice(index, 1);
  } else {
    // objetivo no alcanzado, sigue viajando
    this.x += vx;
    this.y += vy;
  }
};

// dibujar fuegos artificiales
Firework.prototype.draw = function () {
  ctx.beginPath();
  // muévase a la última coordenada rastreada en el conjunto, luego dibuje una línea a la x e y actual
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
  ctx.stroke();

  ctx.beginPath();
  // dibuja el objetivo de este fuego artificial con un círculo pulsante
  ctx.arc(this.tx, this.ty, this.targetRadius, 0, Math.PI * 2);
  ctx.stroke();
};

// crear particula
function Particle(x, y) {
  this.x = x;
  this.y = y;
  // rastrea las coordenadas pasadas de cada partícula para crear un efecto de estela, aumenta el conteo de coordenadas para crear estelas más prominentes
  this.coordinates = [];
  this.coordinateCount = 5;
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  // establecer un ángulo aleatorio en todas las direcciones posibles, en radianes
  this.angle = random(0, Math.PI * 2);
  this.speed = random(1, 10);
  // la fricción ralentizará la partícula
  this.friction = 0.95;
  // se aplicará la gravedad y tirará de la partícula hacia abajo
  this.gravity = 1;
  // establecer el tono en un número aleatorio +-20 de la variable de tono general
  this.hue = random(hue - 20, hue + 20);
  this.brightness = random(50, 80);
  this.alpha = 1;
  // establecer qué tan rápido se desvanece la partícula
  this.decay = random(0.015, 0.03);
}

// actualizar partícula
Particle.prototype.update = function (index) {
  // elimina el último elemento en la matriz de coordenadas
  this.coordinates.pop();
  // agrega las coordenadas actuales al inicio de la matriz
  this.coordinates.unshift([this.x, this.y]);
  // ralentiza la partícula
  this.speed *= this.friction;
  // aplicar velocidad
  this.x += Math.cos(this.angle) * this.speed;
  this.y += Math.sin(this.angle) * this.speed + this.gravity;
  // desvanecer la partícula
  this.alpha -= this.decay;

  //  elimina la partícula una vez que el alfa es lo suficientemente bajo, según el índice pasado
  if (this.alpha <= this.decay) {
    particles.splice(index, 1);
  }
};

// dibujar partícula
Particle.prototype.draw = function () {
  ctx.beginPath();
  // moverse a las últimas coordenadas rastreadas en el conjunto, luego dibujar una línea a la x e y actual
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
  ctx.stroke();
};

// crear grupo de partículas/explosión
function createParticles(x, y) {
  // aumente el recuento de partículas para una explosión más grande, sin embargo, tenga cuidado con el rendimiento del lienzo afectado con el aumento de partículas
  var particleCount = 30;
  while (particleCount--) {
    particles.push(new Particle(x, y));
  }
}

// bucle de demostración principal
function loop() {
  // esta función se ejecutará indefinidamente con requestAnimationFrame
  requestAnimFrame(loop);

  // aumentar el tono para obtener fuegos artificiales de diferentes colores con el tiempo
  hue += 0.5;

  // normalmente, clearRect() se usaría para borrar el lienzo
  // aunque queremos crear un efecto final
  // establecer la operación compuesta en destino-fuera nos permitirá borrar el lienzo con una opacidad específica, en lugar de borrarlo por completo
  ctx.globalCompositeOperation = 'destination-out';
  // disminuye la propiedad alfa para crear senderos más prominentes
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, cw, ch);
  // cambiar la operación compuesta de vuelta a nuestro modo principal
  // el encendedor crea puntos de luz brillantes cuando los fuegos artificiales y las partículas se superponen entre sí
  ctx.globalCompositeOperation = 'lighter';

  //  recorrer cada fuego artificial, dibujarlo, actualizarlo
  var i = fireworks.length;
  while (i--) {
    fireworks[i].draw();
    fireworks[i].update(i);
  }

  // recorrer cada partícula, dibujarla, actualizarla
  var i = particles.length;
  while (i--) {
    particles[i].draw();
    particles[i].update(i);
  }

  // lanza fuegos artificiales automáticamente a coordenadas aleatorias, cuando el mouse no está presionado
  if (timerTick >= timerTotal) {
    if (!mousedown) {
      // inicia los fuegos artificiales en la parte inferior central de la pantalla, luego establece las coordenadas aleatorias del objetivo, las coordenadas aleatorias y se establecerán dentro del rango de la mitad superior de la pantalla
      fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
      timerTick = 0;
    }
  } else {
    timerTick++;
  }

  // limita la velocidad a la que se lanzan los fuegos artificiales cuando el mouse está presionado
  if (limiterTick >= limiterTotal) {
    if (mousedown) {
      // inicie los fuegos artificiales en la parte inferior central de la pantalla, luego configure las coordenadas actuales del mouse como el objetivo 
      fireworks.push(new Firework(cw / 2, ch, mx, my));
      limiterTick = 0;
    }
  } else {
    limiterTick++;
  }
}

window.onload = function () {
  var merrywrap = document.getElementById("merrywrap");
  var box = merrywrap.getElementsByClassName("giftbox")[0];
  var step = 1;
  var stepMinutes = [2000, 2000, 1000, 1000];
  function init() {
    box.addEventListener("click", openBox, false);
  }
  function stepClass(step) {
    merrywrap.className = 'merrywrap';
    merrywrap.className = 'merrywrap step-' + step;
  }
  function openBox() {
    if (step === 1) {
      box.removeEventListener("click", openBox, false);
    }
    stepClass(step);
    if (step === 3) {
    }
    if (step === 4) {
      reveal();
      return;
    }
    setTimeout(openBox, stepMinutes[step - 1]);
    step++;
  }

  init();

};

function reveal() {
  document.querySelector('.merrywrap').style.backgroundColor = 'transparent';

  loop();

  var w, h;
  if (window.innerWidth >= 1000) {
    w = 3050;h = 185;
  } else
  {
    w = 2550;h = 155;
  }

  var ifrm = document.createElement("iframe");
  ifrm.setAttribute("src", "video.mp4");
  //ifrm.style.width = `${w}px`;
  //ifrm.style.height = `${h}px`;
  ifrm.style.border = 'none';
  document.querySelector('#video').appendChild(ifrm);
}

