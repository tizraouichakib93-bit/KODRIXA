window.KODRIXA_DATA = {
  generator: {
    python: [
      {
        id: 'timer', label: 'Countdown timer', prompt: 'Make a countdown timer in Python that counts down from 10 seconds.',
        keywords: ['countdown', 'timer', 'pomodoro', 'stopwatch'], filename: 'countdown.py',
        note: 'Run with Python 3. The timer prints to the terminal and blocks while it counts.',
        code: `import time


def countdown(seconds):
    if seconds < 0:
        raise ValueError("Seconds cannot be negative")
    while seconds > 0:
        print(f"Time left: {seconds}s")
        time.sleep(1)
        seconds -= 1
    print("Time's up. Go build!")


countdown(10)`
      },
      {
        id: 'fibonacci', label: 'Fibonacci sequence', prompt: 'Write a Python function that returns the first 10 Fibonacci numbers.',
        keywords: ['fibonacci', 'sequence', 'series'], filename: 'fibonacci.py',
        note: 'Returns a list, so you can reuse the sequence instead of only printing it.',
        code: `def fibonacci(count):
    if count < 0:
        raise ValueError("Count cannot be negative")
    sequence = []
    a, b = 0, 1
    for _ in range(count):
        sequence.append(a)
        a, b = b, a + b
    return sequence


print(fibonacci(10))`
      },
      {
        id: 'temperature', label: 'Temperature converter', prompt: 'Convert temperatures between Celsius and Fahrenheit in Python.',
        keywords: ['temperature', 'celsius', 'fahrenheit', 'convert'], filename: 'temperature.py',
        note: 'Two small pure functions plus a printed conversion table.',
        code: `def celsius_to_fahrenheit(celsius):
    return celsius * 9 / 5 + 32


def fahrenheit_to_celsius(fahrenheit):
    return (fahrenheit - 32) * 5 / 9


for celsius in [0, 20, 37, 100]:
    fahrenheit = celsius_to_fahrenheit(celsius)
    print(f"{celsius} C = {fahrenheit:.1f} F")

print(f"68 F = {fahrenheit_to_celsius(68):.1f} C")`
      },
      {
        id: 'password', label: 'Password generator', prompt: 'Generate a strong random password in Python.',
        keywords: ['password', 'random', 'passphrase', 'secret'], filename: 'password_generator.py',
        note: 'Uses the secrets module, which is designed for security-sensitive randomness.',
        code: `import secrets
import string


def generate_password(length=16):
    if length < 4:
        raise ValueError("Use at least 4 characters")
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return "".join(secrets.choice(alphabet) for _ in range(length))


print(generate_password(16))`
      }
    ],
    javascript: [
      {
        id: 'timer', label: 'Browser countdown', prompt: 'Make a countdown timer in JavaScript that updates the page every second.',
        keywords: ['countdown', 'timer', 'pomodoro', 'stopwatch'], filename: 'countdown.js',
        note: 'Paste into a browser console or load on a page. It creates its own display element.',
        code: `const display = document.createElement("div");
display.style.cssText = "font:700 48px system-ui;color:#a78bfa;padding:24px";
display.textContent = "10";
document.body.appendChild(display);

let remaining = 10;
const timer = setInterval(() => {
  remaining -= 1;
  display.textContent = remaining > 0 ? String(remaining) : "Time's up. Go build!";
  if (remaining <= 0) clearInterval(timer);
}, 1000);`
      },
      {
        id: 'todo', label: 'Tiny task list', prompt: 'Build a small to-do list in JavaScript with add, complete, and delete buttons.',
        keywords: ['todo', 'to-do', 'task', 'tasks', 'checklist'], filename: 'todo.js',
        note: 'Builds a working task list in the current page using safe textContent rendering.',
        code: `const app = document.createElement("section");
const input = document.createElement("input");
const addButton = document.createElement("button");
const list = document.createElement("ul");

input.placeholder = "What needs doing?";
addButton.textContent = "Add task";
app.append(input, addButton, list);
document.body.appendChild(app);

addButton.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) return;

  const item = document.createElement("li");
  const label = document.createElement("span");
  const done = document.createElement("button");
  const remove = document.createElement("button");

  label.textContent = text;
  done.textContent = "Complete";
  remove.textContent = "Delete";
  done.addEventListener("click", () => {
    label.style.textDecoration = label.style.textDecoration ? "" : "line-through";
  });
  remove.addEventListener("click", () => item.remove());

  item.append(label, done, remove);
  list.appendChild(item);
  input.value = "";
  input.focus();
});`
      },
      {
        id: 'fibonacci', label: 'Fibonacci sequence', prompt: 'Write a JavaScript function that returns the first 10 Fibonacci numbers.',
        keywords: ['fibonacci', 'sequence', 'series'], filename: 'fibonacci.js',
        note: 'Runs in any modern browser or Node.js.',
        code: `function fibonacci(count) {
  if (count < 0) throw new RangeError("Count cannot be negative");
  const sequence = [];
  let a = 0;
  let b = 1;
  for (let i = 0; i < count; i += 1) {
    sequence.push(a);
    [a, b] = [b, a + b];
  }
  return sequence;
}

console.log(fibonacci(10));`
      },
      {
        id: 'password', label: 'Password generator', prompt: 'Generate a strong random password in JavaScript.',
        keywords: ['password', 'random', 'passphrase', 'secret'], filename: 'password.js',
        note: 'Uses the Web Crypto API. Run on HTTPS or localhost.',
        code: `function generatePassword(length = 16) {
  if (length < 4) throw new RangeError("Use at least 4 characters");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

console.log(generatePassword(16));`
      }
    ],
    cpp: [
      {
        id: 'timer', label: 'Countdown timer', prompt: 'Make a countdown timer in C++ that counts down from 10 seconds.',
        keywords: ['countdown', 'timer', 'stopwatch'], filename: 'countdown.cpp',
        note: 'Compile with a C++11-or-newer compiler. Uses the standard thread and chrono libraries.',
        code: `#include <chrono>
#include <iostream>
#include <stdexcept>
#include <thread>

void countdown(int seconds) {
    if (seconds < 0) throw std::invalid_argument("Seconds cannot be negative");
    while (seconds > 0) {
        std::cout << "Time left: " << seconds << "s" << std::endl;
        std::this_thread::sleep_for(std::chrono::seconds(1));
        seconds -= 1;
    }
    std::cout << "Time's up. Go build!" << std::endl;
}

int main() {
    countdown(10);
    return 0;
}`
      },
      {
        id: 'fibonacci', label: 'Fibonacci sequence', prompt: 'Print the first 10 Fibonacci numbers in C++.',
        keywords: ['fibonacci', 'sequence', 'series'], filename: 'fibonacci.cpp',
        note: 'Uses long long to delay overflow for larger sequence indexes.',
        code: `#include <iostream>
#include <vector>

std::vector<long long> fibonacci(int count) {
    std::vector<long long> sequence;
    long long a = 0;
    long long b = 1;
    for (int i = 0; i < count; i += 1) {
        sequence.push_back(a);
        long long next = a + b;
        a = b;
        b = next;
    }
    return sequence;
}

int main() {
    for (long long value : fibonacci(10)) {
        std::cout << value << " ";
    }
    std::cout << std::endl;
    return 0;
}`
      },
      {
        id: 'temperature', label: 'Temperature converter', prompt: 'Convert Celsius to Fahrenheit in C++.',
        keywords: ['temperature', 'celsius', 'fahrenheit', 'convert'], filename: 'temperature.cpp',
        note: 'A compact function plus a formatted conversion table.',
        code: `#include <iomanip>
#include <iostream>

double celsiusToFahrenheit(double celsius) {
    return celsius * 9.0 / 5.0 + 32.0;
}

int main() {
    std::cout << std::fixed << std::setprecision(1);
    for (int celsius : {0, 20, 37, 100}) {
        std::cout << celsius << " C = " << celsiusToFahrenheit(celsius) << " F" << std::endl;
    }
    return 0;
}`
      }
    ],
    html: [
      {
        id: 'profile', label: 'Responsive profile card', prompt: 'Build a responsive profile card in HTML and CSS with a small interactive button.',
        keywords: ['profile', 'card', 'portfolio', 'landing', 'html', 'css', 'website'], filename: 'profile-card.html',
        note: 'A complete single-file page. Save it and open it in a browser.',
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Builder Profile</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      background: #090812; color: #f4f0ff;
      font-family: system-ui, sans-serif;
    }
    .card {
      width: min(360px, calc(100% - 40px)); padding: 32px;
      border: 1px solid #7c5ce055; border-radius: 20px;
      background: linear-gradient(145deg, #1a1430, #0d1224);
      box-shadow: 0 20px 60px #00000066; text-align: center;
    }
    .avatar {
      width: 76px; height: 76px; margin: 0 auto 18px; display: grid;
      place-items: center; border-radius: 50%; font-size: 26px; font-weight: 700;
      background: linear-gradient(135deg, #a78bfa, #5b8cff);
    }
    h1 { margin: 0; font-size: 24px; }
    p { color: #b7abd2; line-height: 1.6; }
    button {
      padding: 12px 20px; border: 0; border-radius: 10px; cursor: pointer;
      background: linear-gradient(120deg, #8b5cf6, #5b8cff); color: white;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <article class="card">
    <div class="avatar" aria-hidden="true">KX</div>
    <h1>Your Name</h1>
    <p>Builder, learner, and maker of useful things. Replace this bio with your own story.</p>
    <button id="helloButton" type="button">Say hello</button>
  </article>
  <script>
    const button = document.getElementById("helloButton");
    button.addEventListener("click", () => {
      button.textContent = "Thanks for stopping by!";
      button.disabled = true;
    });
  <\/script>
</body>
</html>`
      }
    ]
  },

  debuggerSamples: [
    {
      id: 'python-colon', label: 'Missing colon', language: 'python', filename: 'launch.py',
      code: `def launch(project):
    if project == "KODRIXA"
        print("Ready to build")
    return True

print(launch("KODRIXA"))`
    },
    {
      id: 'js-brace', label: 'Unclosed brace', language: 'javascript', filename: 'greet.js',
      code: `function greet(name) {
  const message = "Hello, " + name;
  console.log(message);`
    },
    {
      id: 'python-print', label: 'Legacy print', language: 'python', filename: 'hello.py',
      code: `message = "Hello, KODRIXA"
print message`
    },
    {
      id: 'cpp-semicolon', label: 'Missing semicolon', language: 'cpp', filename: 'main.cpp',
      code: `#include <iostream>

int main() {
    std::cout << "Ready to build" << std::endl
    return 0;
}`
    },
    {
      id: 'js-const', label: 'Const reassignment', language: 'javascript', filename: 'score.js',
      code: `const score = 10;
score = 20;
console.log(score);`
    }
  ],

  converter: {
    languages: [
      { id: 'python', label: 'Python', extension: 'py' },
      { id: 'javascript', label: 'JavaScript', extension: 'js' },
      { id: 'cpp', label: 'C++', extension: 'cpp' }
    ],
    recipes: [
      {
        id: 'hello', label: 'Hello, world',
        codes: {
          python: `print("Hello, KODRIXA!")`,
          javascript: `console.log("Hello, KODRIXA!");`,
          cpp: `#include <iostream>

int main() {
    std::cout << "Hello, KODRIXA!" << std::endl;
    return 0;
}`
        }
      },
      {
        id: 'add', label: 'Add two numbers',
        codes: {
          python: `def add(a, b):
    return a + b

print(add(3, 5))`,
          javascript: `function add(a, b) {
  return a + b;
}

console.log(add(3, 5));`,
          cpp: `#include <iostream>

int add(int a, int b) {
    return a + b;
}

int main() {
    std::cout << add(3, 5) << std::endl;
    return 0;
}`
        }
      },
      {
        id: 'countdown', label: 'Count to five',
        codes: {
          python: `for seconds in range(5, 0, -1):
    print(seconds)
print("Lift off!")`,
          javascript: `for (let seconds = 5; seconds > 0; seconds -= 1) {
  console.log(seconds);
}
console.log("Lift off!");`,
          cpp: `#include <iostream>

int main() {
    for (int seconds = 5; seconds > 0; seconds -= 1) {
        std::cout << seconds << std::endl;
    }
    std::cout << "Lift off!" << std::endl;
    return 0;
}`
        }
      },
      {
        id: 'even-odd', label: 'Even or odd',
        codes: {
          python: `number = 7
if number % 2 == 0:
    print("Even")
else:
    print("Odd")`,
          javascript: `const number = 7;
if (number % 2 === 0) {
  console.log("Even");
} else {
  console.log("Odd");
}`,
          cpp: `#include <iostream>

int main() {
    int number = 7;
    if (number % 2 == 0) {
        std::cout << "Even" << std::endl;
    } else {
        std::cout << "Odd" << std::endl;
    }
    return 0;
}`
        }
      }
    ]
  },

  explainerSamples: [
    {
      id: 'python-fibonacci', label: 'Python Fibonacci', language: 'python', filename: 'fibonacci.py',
      code: `def fibonacci(count):
    sequence = []
    a, b = 0, 1
    for _ in range(count):
        sequence.append(a)
        a, b = b, a + b
    return sequence

print(fibonacci(10))`
    },
    {
      id: 'js-greet', label: 'JavaScript greeting', language: 'javascript', filename: 'greet.js',
      code: `function greet(name) {
  const message = "Hello, " + name + "!";
  console.log(message);
}

greet("Builder");`
    },
    {
      id: 'arduino-blink', label: 'Arduino blink', language: 'arduino', filename: 'blink.ino',
      code: `const int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(1000);
  digitalWrite(ledPin, LOW);
  delay(1000);
}`
    },
    {
      id: 'cpp-hello', label: 'C++ hello', language: 'cpp', filename: 'hello.cpp',
      code: `#include <iostream>

int main() {
    std::cout << "Hello, KODRIXA!" << std::endl;
    return 0;
}`
    }
  ],

  hardware: [
    {
      id: 'blink', label: 'Blink an LED', title: 'The first blink', difficulty: 'Beginner', time: '15 min',
      keywords: ['blink', 'led', 'light', 'flash'], filename: 'blink.ino',
      description: 'The hello-world of hardware. Make an LED breathe on and off every second, and learn the setup/loop rhythm behind every Arduino sketch.',
      boardNote: 'Pin 13 is connected to the built-in LED on many Uno and Nano boards. The external LED circuit is optional but recommended for learning.',
      safety: 'Disconnect USB while changing wires. Always use a current-limiting resistor with an external LED.',
      code: `const int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(1000);
  digitalWrite(ledPin, LOW);
  delay(1000);
}`,
      components: [
        { name: 'Arduino Uno or Nano', qty: 1, note: 'Any classic 5V Arduino with pin 13' },
        { name: '5mm LED', qty: 1, note: 'Any color; long leg is the anode' },
        { name: '220Ω resistor', qty: 1, note: 'Red-red-brown bands; protects the LED' },
        { name: 'Breadboard', qty: 1, note: 'Half-size is plenty' },
        { name: 'Jumper wires', qty: 2, note: 'Male-to-male' },
        { name: 'USB cable', qty: 1, note: 'Matches your Arduino board' }
      ],
      wiring: [
        { from: 'Arduino D13', to: 'Resistor leg A', color: '#5b8cff', note: 'Signal leaves the board through the resistor.' },
        { from: 'Resistor leg B', to: 'LED anode (+, long leg)', color: '#a78bfa', note: 'Current enters the LED here.' },
        { from: 'LED cathode (−, short leg)', to: 'Arduino GND', color: '#8b8b9e', note: 'Completes the circuit back to ground.' }
      ],
      guide: [
        '<strong>Wire it safely.</strong> Unplug the board, then build the D13 → resistor → LED → GND path.',
        '<strong>Open the Arduino IDE.</strong> Create a new sketch and replace its contents with the generated code.',
        '<strong>Choose your hardware.</strong> Select the correct board and port under Tools.',
        '<strong>Verify, then upload.</strong> Fix any compiler messages before uploading.',
        '<strong>Watch the rhythm.</strong> The LED should turn on for one second and off for one second. Change the delay values to remix the pattern.'
      ]
    },
    {
      id: 'distance', label: 'Distance alert', title: 'Close-range radar', difficulty: 'Intermediate', time: '35 min',
      keywords: ['distance', 'ultrasonic', 'radar', 'hc-sr04', 'sensor', 'proximity'], filename: 'distance_alert.ino',
      description: 'Build a tiny proximity alarm. An ultrasonic sensor measures distance, the Serial Monitor shows live readings, and an LED warns when something gets too close.',
      boardNote: 'The HC-SR04 needs 5V. Do not connect its 5V echo output directly to a 3.3V-only board without level shifting.',
      safety: 'Disconnect power while wiring. Keep the sensor face clear and avoid measuring soft, angled, or very distant objects for reliable readings.',
      code: `const int trigPin = 9;
const int echoPin = 10;
const int ledPin = 8;

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);
  if (duration == 0) {
    Serial.println("No reading");
    digitalWrite(ledPin, LOW);
    delay(100);
    return;
  }

  float distanceCm = duration * 0.0343 / 2.0;
  Serial.print("Distance: ");
  Serial.print(distanceCm);
  Serial.println(" cm");

  digitalWrite(ledPin, distanceCm < 20 ? HIGH : LOW);
  delay(100);
}`,
      components: [
        { name: 'Arduino Uno or Nano', qty: 1, note: 'Classic 5V board' },
        { name: 'HC-SR04 ultrasonic sensor', qty: 1, note: 'Four pins: VCC, Trig, Echo, GND' },
        { name: '5mm LED', qty: 1, note: 'Warning indicator' },
        { name: '220Ω resistor', qty: 1, note: 'In series with the LED' },
        { name: 'Breadboard + jumper wires', qty: 1, note: 'At least six connections' },
        { name: 'USB cable', qty: 1, note: 'For power and serial output' }
      ],
      wiring: [
        { from: 'HC-SR04 VCC', to: 'Arduino 5V', color: '#ff718b', note: 'Powers the sensor.' },
        { from: 'HC-SR04 GND', to: 'Arduino GND', color: '#8b8b9e', note: 'Shared ground reference.' },
        { from: 'HC-SR04 Trig', to: 'Arduino D9', color: '#5b8cff', note: 'The board sends the ultrasonic pulse.' },
        { from: 'HC-SR04 Echo', to: 'Arduino D10', color: '#67e8f9', note: 'The sensor returns the echo timing.' },
        { from: 'Arduino D8', to: '220Ω resistor → LED anode', color: '#a78bfa', note: 'LED cathode returns to GND.' }
      ],
      guide: [
        '<strong>Build the circuit.</strong> Wire the sensor first, then add the LED and resistor on a separate branch.',
        '<strong>Upload the sketch.</strong> Select the board and port, verify, and upload.',
        '<strong>Open the Serial Monitor.</strong> Set the baud rate to 9600 to see distance readings.',
        '<strong>Test the threshold.</strong> Move your hand closer than 20 cm; the LED should turn on.',
        '<strong>Calibrate expectations.</strong> Ultrasonic readings are approximate. Adjust the timeout and threshold for your environment.'
      ]
    },
    {
      id: 'plant', label: 'Plant monitor', title: 'Thirsty-plant sentinel', difficulty: 'Intermediate', time: '40 min',
      keywords: ['plant', 'soil', 'moisture', 'garden', 'water'], filename: 'plant_monitor.ino',
      description: 'Give your plant a voice. A capacitive soil sensor reports moisture levels, and an LED flags when the soil reads dry. Calibrate it for your own soil and pot.',
      boardNote: 'Use a capacitive soil sensor rather than a bare resistive probe to reduce corrosion. Confirm your module supports 5V before connecting it.',
      safety: 'Keep water away from the Arduino and exposed connections. Do not submerge the sensor electronics; insert only the marked probe area.',
      code: `const int sensorPin = A0;
const int ledPin = 13;
const int dryThreshold = 600;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int moisture = analogRead(sensorPin);
  Serial.print("Soil reading: ");
  Serial.println(moisture);

  if (moisture > dryThreshold) {
    digitalWrite(ledPin, HIGH);
    Serial.println("Soil reads dry - check your plant.");
  } else {
    digitalWrite(ledPin, LOW);
  }

  delay(1000);
}`,
      components: [
        { name: 'Arduino Uno or Nano', qty: 1, note: 'Analog input A0 is required' },
        { name: 'Capacitive soil moisture sensor', qty: 1, note: 'Analog output, 3.3–5V compatible module' },
        { name: '5mm LED', qty: 1, note: 'Dry-soil indicator; built-in LED may also work' },
        { name: '220Ω resistor', qty: 1, note: 'Needed for an external LED' },
        { name: 'Breadboard + jumper wires', qty: 1, note: 'For power, ground, and signal' },
        { name: 'USB cable', qty: 1, note: 'Power and Serial Monitor' }
      ],
      wiring: [
        { from: 'Sensor VCC', to: 'Arduino 5V', color: '#ff718b', note: 'Check the module voltage rating first.' },
        { from: 'Sensor GND', to: 'Arduino GND', color: '#8b8b9e', note: 'Common ground.' },
        { from: 'Sensor AOUT', to: 'Arduino A0', color: '#c4f879', note: 'Analog moisture voltage.' },
        { from: 'Arduino D13', to: '220Ω resistor → LED anode', color: '#a78bfa', note: 'LED cathode goes to GND.' }
      ],
      guide: [
        '<strong>Wire the sensor.</strong> Connect VCC, GND, and AOUT before inserting the probe into soil.',
        '<strong>Upload and observe.</strong> Open the Serial Monitor at 9600 baud and watch the raw readings.',
        '<strong>Calibrate.</strong> Record the reading in dry soil and in freshly watered soil, then choose a threshold between them.',
        '<strong>Update the sketch.</strong> Replace dryThreshold with your calibrated value and upload again.',
        '<strong>Deploy gently.</strong> Insert only the probe section, keep electronics dry, and treat the LED as a hint — not a watering schedule.'
      ]
    }
  ]
};