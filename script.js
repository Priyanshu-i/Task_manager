// Initialize data structure
let folders = [];
let currentFolder = null;
let hiddenFolders = [];
let fileHandle = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Initialize icons
    lucide.createIcons();

    // Attach openExcelFile to button click
    const openButton = document.getElementById('openButton');
    if (openButton) {
        openButton.addEventListener('click', async () => {
            await openExcelFile();
            await loadFromExcel();
        });
    } else {
        console.error('Element with ID "openButton" not found.');
    }

    // Attach saveToExcel to button click
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', saveToExcel);
    } else {
        console.error('Element with ID "saveButton" not found.');
    }

    // Set up auto-save every 5 minutes (300000 milliseconds)
    setInterval(autoSave, 1000);
});

async function getOrCreateExcelFile() {
    if (!fileHandle) {
        try {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: 'tasks.xlsx',
                types: [{
                    description: 'Excel Workbook',
                    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
                }}],
            });
        } catch (err) {
            console.error('Failed to create/get Excel file:', err);
            return null;
        }
    }
    return fileHandle;
}

async function openExcelFile() {
    try {
        [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'Excel Workbook',
                accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
            }}],
        });
    } catch (err) {
        console.error('Failed to open Excel file:', err);
        return null;
    }
    return fileHandle;
}

async function saveToExcel() {
    const handle = await getOrCreateExcelFile();
    if (!handle) return;

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(convertToExcelFormat());
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    try {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
    } catch (err) {
        console.error('Failed to save file:', err);
    }
}

async function loadFromExcel() {
    if (!fileHandle) {
        await openExcelFile();
    }
    if (!fileHandle) return;

    try {
        const file = await fileHandle.getFile();
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        folders = [];
        hiddenFolders = [];
        
        jsonData.forEach(row => {
            const isHidden = row.Hidden === 'true';
            const targetArray = isHidden ? hiddenFolders : folders;
            
            let folder = targetArray.find(f => f.name === row.Folder);
            if (!folder) {
                folder = { name: row.Folder, tasks: [], hidden: isHidden };
                targetArray.push(folder);
            }
            
            if (row.TaskName) {
                folder.tasks.push({
                    name: row.TaskName,
                    completed: row.Completed === 'true',
                    note: row.Note || '',
                    link: row.Link || ''
                });
            }
        });
        
        renderAll();
    } catch (error) {
        console.error('Error loading Excel file:', error);
        // If file doesn't exist or is empty, start with empty data
        folders = [];
        hiddenFolders = [];
        renderAll();
    }
}

async function autoSave() {
    await saveToExcel();
}

function convertToExcelFormat() {
    return [...folders, ...hiddenFolders].flatMap(folder => 
        folder.tasks.length === 0 ? [{
            Folder: folder.name,
            TaskName: '',
            Completed: '',
            Note: '',
            Link: '',
            Hidden: folder.hidden ? 'true' : 'false'
        }] : folder.tasks.map(task => ({
            Folder: folder.name,
            TaskName: task.name,
            Completed: task.completed ? 'true' : 'false',
            Note: task.note || '',
            Link: task.link || '',
            Hidden: folder.hidden ? 'true' : 'false'
        }))
    );
}






async function loadFromExcel() {
    const handle = await getOrCreateExcelFile();
    if (!handle) return;

    try {
        const file = await handle.getFile();
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        folders = [];
        hiddenFolders = [];
        
        jsonData.forEach(row => {
            const isHidden = row.Hidden === 'true';
            const targetArray = isHidden ? hiddenFolders : folders;
            
            let folder = targetArray.find(f => f.name === row.Folder);
            if (!folder) {
                folder = { name: row.Folder, tasks: [], hidden: isHidden };
                targetArray.push(folder);
            }
            
            if (row.TaskName) {
                folder.tasks.push({
                    name: row.TaskName,
                    completed: row.Completed === 'true',
                    note: row.Note || '',
                    link: row.Link || ''
                });
            }
        });
        
        renderAll();
    } catch (error) {
        console.error('Error loading Excel file:', error);
        // If file doesn't exist or is empty, start with empty data
        folders = [];
        hiddenFolders = [];
        renderAll();
    }
}


// Auto-save function
async function autoSave() {
    await saveToExcel();
}

// UI Rendering functions
function renderAll() {
    renderFolders();
    renderTasks();
    renderHiddenFolders();
}

function renderFolders() {
    const folderList = document.getElementById('folder-list');
    folderList.innerHTML = '';
    
    folders.forEach((folder, index) => {
        const li = document.createElement('li');
        li.className = 'folder';
        li.innerHTML = `
            <div class="folder-content">
                <i data-lucide="folder"></i>
                <span>${folder.name}</span>
            </div>
            <div class="folder-actions">
                <button class="icon-btn edit-folder" title="Edit">
                    <i data-lucide="edit-2"></i>
                </button>
                <button class="icon-btn hide-folder" title="Hide">
                    <i data-lucide="eye-off"></i>
                </button>
                <button class="icon-btn delete-folder" title="Delete">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        
        // Folder click event
        li.querySelector('.folder-content').addEventListener('click', () => selectFolder(index));
        
        // Edit folder event
        li.querySelector('.edit-folder').addEventListener('click', (e) => {
            e.stopPropagation();
            showEditModal('Edit Folder', folder.name, async (newName) => {
                folder.name = newName;
                await autoSave();
                renderAll();
            });
        });
        
        // Hide folder event
        li.querySelector('.hide-folder').addEventListener('click', async (e) => {
            e.stopPropagation();
            hiddenFolders.push(...folders.splice(index, 1));
            await autoSave();
            renderAll();
        });
        
        // Delete folder event
        li.querySelector('.delete-folder').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this folder?')) {
                folders.splice(index, 1);
                if (currentFolder === index) currentFolder = null;
                await autoSave();
                renderAll();
            }
        });
        
        folderList.appendChild(li);
    });
    
    lucide.createIcons();
}

function renderTasks() {
    const taskList = document.getElementById('task-list');
    const addTaskBtn = document.getElementById('add-task-btn');
    
    taskList.innerHTML = '';
    addTaskBtn.style.display = currentFolder !== null ? 'flex' : 'none';
    
    if (currentFolder !== null) {
        document.getElementById('current-folder').textContent = folders[currentFolder].name;
        
        folders[currentFolder].tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `task ${task.link ? 'has-link' : ''}`;
            li.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" class="checkbox" ${task.completed ? 'checked' : ''}>
                    <span>${task.name}</span>
                </div>
                <div class="task-actions">
                    <button class="icon-btn add-link" title="Add Link">
                        <i data-lucide="link"></i>
                    </button>
                    <button class="icon-btn edit-task" title="Edit">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="icon-btn delete-task" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
                ${task.link ? `<a href="${task.link}" class="task-link" target="_blank">📎 ${task.link}</a>` : ''}
                <input type="text" class="note-input" placeholder="Add note" value="${task.note || ''}">
            `;
            
            // Task checkbox event
            li.querySelector('.checkbox').addEventListener('change', async (e) => {
                task.completed = e.target.checked;
                await autoSave();
                renderAll();
            });
            
            // Task note event
            li.querySelector('.note-input').addEventListener('input', async (e) => {
                task.note = e.target.value;
                await autoSave();
            });
            
            // Add link event
            li.querySelector('.add-link').addEventListener('click', async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    task.link = URL.createObjectURL(file);
                    await autoSave();
                    renderTasks();
                };
                input.click();
            });
            
            // Edit task event
            li.querySelector('.edit-task').addEventListener('click', () => {
                showEditModal('Edit Task', task.name, async (newName) => {
                    task.name = newName;
                    await autoSave();
                    renderTasks();
                });
            });
            
            // Delete task event
            li.querySelector('.delete-task').addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this task?')) {
                    folders[currentFolder].tasks.splice(index, 1);
                    await autoSave();
                    renderTasks();
                }
            });
            
            taskList.appendChild(li);
        });
        
        lucide.createIcons();
    }
}

function renderHiddenFolders() {
    const hiddenList = document.getElementById('hidden-folders-list');
    hiddenList.innerHTML = '';
    
    hiddenFolders.forEach((folder, index) => {
        const li = document.createElement('li');
        li.className = 'hidden-folder';
        li.innerHTML = `
            <span>${folder.name}</span>
            <button class="icon-btn unhide-folder" title="Unhide">
                <i data-lucide="eye"></i>
            </button>
        `;
        
        li.querySelector('.unhide-folder').addEventListener('click', async () => {
            folders.push(...hiddenFolders.splice(index, 1));
            await autoSave();
            renderAll();
        });
        
        hiddenList.appendChild(li);
    });
    
    lucide.createIcons();
}

// Event handlers
function selectFolder(index) {
    currentFolder = index;
    renderTasks();
}

function showEditModal(title, initialValue, callback) {
    const modal = document.getElementById('edit-modal');
    const input = document.getElementById('edit-input');
    
    modal.querySelector('h2').textContent = title;
    input.value = initialValue;
    modal.style.display = 'block';
    input.focus();
    
    const saveEdit = () => {
        const value = input.value.trim();
        if (value) {
            callback(value);
            modal.style.display = 'none';
        }
    };
    
    document.getElementById('save-edit-btn').onclick = saveEdit;
    input.onkeypress = (e) => {
        if (e.key === 'Enter') saveEdit();
    };
}

// Search functionality
document.getElementById('search-input').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    document.querySelectorAll('.folder').forEach(folder => {
        const folderName = folder.querySelector('span').textContent.toLowerCase();
        folder.style.display = folderName.includes(searchTerm) ? '' : 'none';
    });
    
    if (currentFolder !== null) {
        document.querySelectorAll('.task').forEach(task => {
            const taskName = task.querySelector('span').textContent.toLowerCase();
            const taskNote = task.querySelector('.note-input').value.toLowerCase();
            task.style.display = 
                taskName.includes(searchTerm) || taskNote.includes(searchTerm) ? '' : 'none';
        });
    }
});

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});

// Add folder button
document.getElementById('add-folder-btn').addEventListener('click', () => {
    showEditModal('New Folder', '', async (name) => {
        folders.push({ name, tasks: [], hidden: false });
        await autoSave();
        renderAll();
    });
});

// Add task button
document.getElementById('add-task-btn').addEventListener('click', () => {
    if (currentFolder !== null) {
        showEditModal('New Task', '', async (name) => {
            folders[currentFolder].tasks.push({
                name,
                completed: false,
                note: '',
                link: ''
            });
            await autoSave();
            renderTasks();
        });
    }
});

// Settings button
document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('settings-modal').style.display = 'block';
});

// Modal close buttons
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').style.display = 'none';
    });
});

// Click outside modal to close
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});




