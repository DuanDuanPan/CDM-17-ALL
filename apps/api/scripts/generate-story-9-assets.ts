import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.resolve(__dirname, '../mock-storage/story-9-assets');

// Helper to write file
function writeFile(filename: string, content: string) {
    fs.writeFileSync(path.join(OUT_DIR, filename), content);
    console.log(`Generated: ${filename}`);
}

// ============================================================================
// Geometry Generators (OBJ Format)
// ============================================================================

// 1. Satellite (CubeSat style)
function generateSatellite() {
    // Simple cube
    const vertices = [
        "-1.0 -1.0 -1.0", "1.0 -1.0 -1.0", "1.0 1.0 -1.0", "-1.0 1.0 -1.0", // Front
        "-1.0 -1.0 1.0", "1.0 -1.0 1.0", "1.0 1.0 1.0", "-1.0 1.0 1.0"      // Back
    ];
    // Indices for quads (1-based for OBJ)
    const faces = [
        "1 2 3 4", "5 8 7 6", "1 5 6 2", "2 6 7 3", "3 7 8 4", "5 1 4 8"
    ];
    
    let obj = `# Satellite Model\n`;
    vertices.forEach(v => obj += `v ${v}\n`);
    faces.forEach(f => obj += `f ${f}\n`);
    
    writeFile('Satellite.obj', obj);
    
    // Cloud Map: Temperature (Hotter on sun-facing side)
    const contours = {
        name: "Temperature",
        unit: "C",
        min: -50,
        max: 80,
        values: vertices.map((v, i) => {
            // Assume +Z is facing sun
            return parseFloat(v.split(' ')[2]) > 0 ? 60 + Math.random() * 20 : -40 + Math.random() * 10;
        })
    };
    writeFile('Satellite.scalar.json', JSON.stringify(contours, null, 2));
}

// 2. Rocket Engine Nozzle (Cone)
function generateNozzle() {
    const segments = 16;
    const height = 2.0;
    const topR = 0.5;
    const botR = 1.0;
    
    let vertices = [];
    let faces = [];
    
    // Generate rings
    for(let i=0; i<segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
         vertices.push(`${topR * Math.cos(theta)} ${height} ${topR * Math.sin(theta)}`); // Top ring
         vertices.push(`${botR * Math.cos(theta)} 0.0 ${botR * Math.sin(theta)}`);      // Bottom ring
    }
    
    let obj = `# Engine Nozzle Model\n`;
    vertices.forEach(v => obj += `v ${v}\n`);
    
    // Connect sides
    for(let i=0; i<segments; i++) {
        const next = (i + 1) % segments;
        // Vertices are added in pairs (top, bottom) for each segment index
        // i*2 = top, i*2+1 = bottom
        // This logic is slightly off, let's fix indexing
    }
    
    // Re-do simpler Vertex Gen for easier indexing
    // 0..15 top ring, 16..31 bottom ring
    vertices = [];
    for(let i=0; i<segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        vertices.push(`${topR * Math.cos(theta)} ${height} ${topR * Math.sin(theta)}`);
    }
    for(let i=0; i<segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        vertices.push(`${botR * Math.cos(theta)} 0.0 ${botR * Math.sin(theta)}`);
    }
    
    obj = `# Engine Nozzle Model\n`;
    vertices.forEach(v => obj += `v ${v}\n`);
    
    for(let i=0; i<segments; i++) {
        const next = (i + 1) % segments;
        // Top: i+1, Next: next+1
        // Bottom: 16+i+1, NextBot: 16+next+1
        // Face: Top, Bot, NextBot, NextTop
        const t1 = i + 1;
        const t2 = next + 1;
        const b1 = i + segments + 1;
        const b2 = next + segments + 1;
        obj += `f ${t1} ${b1} ${b2} ${t2}\n`;
    }
    
    writeFile('EngineNozzle.obj', obj);
    
    // Cloud Map: Thermal Stress (Hotter at top/throat)
    const contours = {
        name: "ThermalStress",
        unit: "MPa",
        min: 0,
        max: 500,
        values: vertices.map((v) => {
            const y = parseFloat(v.split(' ')[1]);
            return y > 1.5 ? 450 + Math.random()*50 : 100 + Math.random()*100; // Hotter at top
        })
    };
    writeFile('EngineNozzle.scalar.json', JSON.stringify(contours, null, 2));
}

// 3. Solar Panel (Flat Box)
function generateSolarPanel() {
    const vertices = [
        "-2.0 0.0 -0.5", "2.0 0.0 -0.5", "2.0 0.0 0.5", "-2.0 0.0 0.5"
    ];
    let obj = `# Solar Panel Model\n`;
    vertices.push("0.0 0.0 0.0"); // Center dummy for gradient
    vertices.forEach(v => obj += `v ${v}\n`);
    obj += `f 1 2 3 4\n`;
    
    writeFile('SolarPanel.obj', obj);
    
    // Cloud Map: Efficiency (Higher in center)
    const contours = {
        name: "Efficiency",
        unit: "%",
        min: 10,
        max: 30,
        values: vertices.map((v) => {
            const x = Math.abs(parseFloat(v.split(' ')[0]));
            return 30 - x * 5; // Drops off at edges
        })
    };
    writeFile('SolarPanel.scalar.json', JSON.stringify(contours, null, 2));
}

// 4. Antenna Dish (Hemisphere-ish)
function generateAntenna() {
    let vertices = [];
    vertices.push("0 0 0"); // Center bottom
    const rings = 5;
    const sectors = 12;
    const radius = 1.5;
    
    for(let r=1; r<=rings; r++) {
       const phi = (r/rings) * (Math.PI/2); // 0 to 90
       for(let s=0; s<sectors; s++) {
           const theta = (s/sectors) * Math.PI*2;
           const x = radius * Math.sin(phi) * Math.cos(theta);
           const y = radius * (1 - Math.cos(phi)); // Depth cup
           const z = radius * Math.sin(phi) * Math.sin(theta);
           vertices.push(`${x} ${y} ${z}`);
       }
    }
    
    let obj = `# Antenna Dish Model\n`;
    vertices.forEach(v => obj += `v ${v}\n`);
    // Faces omitted for brevity, just points cloud approximation for mesh is enough for verification if simplified
    // But let's add some dummy faces to make it valid OBJ
    for(let i=0; i<sectors; i++) {
        obj += `f ${1} ${i+2} ${(i+1)%sectors + 2}\n`; // Center fan
    }
    
    writeFile('AntennaDish.obj', obj);
    
    // Cloud Map: Signal Strength (Stronger at center)
    const contours = {
        name: "SignalStrength",
        unit: "dB",
        min: -90,
        max: -10,
        values: vertices.map((v, i) => {
           if(i===0) return -10;
           const r = parseFloat(v.split(' ')[1]); // Depth
           return -10 - (r*30); 
        })
    };
    writeFile('AntennaDish.scalar.json', JSON.stringify(contours, null, 2));
}

// 5. Fuel Tank (Cylinder)
function generateFuelTank() {
    const segments = 12;
    const height = 3.0;
    const rad = 0.8;
    
    let vertices = [];
    for(let i=0; i<segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        vertices.push(`${rad * Math.cos(theta)} ${height} ${rad * Math.sin(theta)}`);
        vertices.push(`${rad * Math.cos(theta)} 0.0 ${rad * Math.sin(theta)}`);
    }
    
    let obj = `# Fuel Tank Model\n`;
    vertices.forEach(v => obj += `v ${v}\n`);
    for(let i=0; i<segments; i++) {
        const next = (i+1)%segments;
        // Two triangles per side face to make a quad
        // Top1 Top2 Bot2 Bot1
        // indices: i*2+1, next*2+1, next*2+2, i*2+2
        const t1 = i*2 + 1;
        const t2 = next*2 + 1;
        const b2 = next*2 + 2;
        const b1 = i*2 + 2;
        obj += `f ${t1} ${b1} ${b2} ${t2}\n`;
    }
    
    writeFile('FuelTank.obj', obj);
    
    // Cloud Map: Pressure (Gradient from bottom to top)
    const contours = {
        name: "Pressure",
        unit: "Bar",
        min: 1,
        max: 50,
        values: vertices.map((v) => {
            const h = parseFloat(v.split(' ')[1]);
            return 1 + (3.0 - h) * 15; // Higher pressure at bottom (0.0)
        })
    };
    writeFile('FuelTank.scalar.json', JSON.stringify(contours, null, 2));
}

function main() {
    if (!fs.existsSync(OUT_DIR)){
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }
    console.log("Generating 5 Aerospace Models...");
    generateSatellite();
    generateNozzle();
    generateSolarPanel();
    generateAntenna();
    generateFuelTank();
    console.log("Done.");
}

main();
