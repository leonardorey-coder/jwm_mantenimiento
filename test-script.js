console.log('🧪 TEST: Script de prueba cargado exitosamente');
console.log('🧪 TEST: User Agent:', navigator.userAgent);
console.log('🧪 TEST: Location:', window.location.href);
console.log('🧪 TEST: Process available:', typeof process !== 'undefined');

if (typeof process !== 'undefined') {
    console.log('🧪 TEST: Process versions:', process.versions);
}

// Mostrar alerta visual
setTimeout(() => {
    const testDiv = document.createElement('div');
    testDiv.innerHTML = 'TEST: Script cargado correctamente';
    testDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: green;
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 9999;
        font-weight: bold;
    `;
    document.body.appendChild(testDiv);
    
    setTimeout(() => testDiv.remove(), 3000);
}, 1000);
