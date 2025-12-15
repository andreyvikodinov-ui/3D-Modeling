// Основные глобальные переменные
let scene, camera, renderer, controls;
let selectedObject = null;
let currentMode = 'select';
let objects = []; // Массив всех объектов на сцене

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    init();
    setupEventListeners();
    animate();
});

// Инициализация Three.js сцены
function init() {
    // Создание сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Создание камеры
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 10);
    
    // Создание рендерера
    const viewport = document.getElementById('viewport');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    renderer.shadowMap.enabled = true;
    viewport.appendChild(renderer.domElement);
    
    // Добавление OrbitControls для управления камерой
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Добавление освещения
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 15);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Добавление сетки для ориентации
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    scene.add(gridHelper);
    
    // Обработка изменения размера окна
    window.addEventListener('resize', onWindowResize);
    
    // Обработка кликов по объектам
    renderer.domElement.addEventListener('click', onCanvasClick);
    
    // Обработка клавиши Delete для удаления объектов
    document.addEventListener('keydown', onKeyDown);
}

// Настройка всех обработчиков событий для кнопок и элементов UI
function setupEventListeners() {
    // Кнопки добавления объектов
    document.getElementById('addCube').addEventListener('click', () => addObject('cube'));
    document.getElementById('addSphere').addEventListener('click', () => addObject('sphere'));
    document.getElementById('addCylinder').addEventListener('click', () => addObject('cylinder'));
    
    // Кнопка экспорта
    document.getElementById('exportSTL').addEventListener('click', exportToSTL);
    
    // Радиокнопки выбора режима
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentMode = e.target.value;
            document.getElementById('modeInfo').textContent = `Режим: ${getModeName(currentMode)}`;
            
            // Отключаем контролы при переключении из режима выбора
            if (currentMode !== 'select' && selectedObject) {
                setupTransformControls(currentMode);
            } else {
                transformControls.dispose();
            }
        });
    });
}

// Функция добавления нового объекта на сцену
function addObject(type) {
    let geometry, material;
    const color = new THREE.Color(Math.random() * 0xffffff);
    
    switch(type) {
        case 'cube':
            geometry = new THREE.BoxGeometry(2, 2, 2);
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry(1, 32, 32);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
            break;
    }
    
    material = new THREE.MeshPhongMaterial({ 
        color: color,
        shininess: 30,
        specular: 0x222222
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
        (Math.random() - 0.5) * 10,
        2,
        (Math.random() - 0.5) * 10
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: type, id: objects.length };
    
    scene.add(mesh);
    objects.push(mesh);
    selectObject(mesh);
}

// Функция выбора объекта
function selectObject(object) {
    // Снимаем выделение с предыдущего объекта
    if (selectedObject) {
        selectedObject.material.emissive.setHex(selectedObject.userData.originalEmissive || 0x000000);
    }
    
    selectedObject = object;
    
    if (object) {
        // Сохраняем оригинальный цвет свечения
        object.userData.originalEmissive = object.material.emissive.getHex();
        // Подсвечиваем выбранный объект
        object.material.emissive.setHex(0x333333);
        
        // Обновляем информацию в интерфейсе
        document.getElementById('selectedInfo').textContent = 
            `Выбран: ${object.userData.type.toUpperCase()} #${object.userData.id}`;
    } else {
        document.getElementById('selectedInfo').textContent = 'Выберите объект';
    }
}

// Обработка клика по холсту для выбора объектов
function onCanvasClick(event) {
    if (currentMode !== 'select') return;
    
    const mouse = new THREE.Vector2();
    const rect = renderer.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(objects);
    
    if (intersects.length > 0) {
        selectObject(intersects[0].object);
    } else {
        selectObject(null);
    }
}

// Экспорт всей сцены в STL файл
function exportToSTL() {
    if (objects.length === 0) {
        alert('На сцене нет объектов для экспорта!');
        return;
    }
    
    const exporter = new THREE.STLExporter();
    
    // Создаем временную сцену для экспорта
    const exportScene = new THREE.Scene();
    objects.forEach(obj => {
        exportScene.add(obj.clone());
    });
    
    const result = exporter.parse(exportScene);
    const blob = new Blob([result], { type: 'text/plain' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `my_3d_model_${Date.now()}.stl`;
    link.click();
    
    // Очистка
    URL.revokeObjectURL(link.href);
}

// Обработка нажатия клавиш (удаление объектов)
function onKeyDown(event) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedObject) {
            // Удаляем объект из сцены и массива
            scene.remove(selectedObject);
            const index = objects.indexOf(selectedObject);
            if (index > -1) {
                objects.splice(index, 1);
            }
            selectObject(null);
        }
    }
}

// Получение понятного имени режима для отображения в UI
function getModeName(mode) {
    const modeNames = {
        'select': 'Выбор',
        'translate': 'Перемещение',
        'rotate': 'Вращение',
        'scale': 'Масштаб'
    };
    return modeNames[mode] || mode;
}

// Обработка изменения размера окна
function onWindowResize() {
    const viewport = document.getElementById('viewport');
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
}

// Главный цикл анимации
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Для плавности управления
    renderer.render(scene, camera);
}
