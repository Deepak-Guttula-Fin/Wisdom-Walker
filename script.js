let current = new Date();
let selectedKey = "";
let chartInstance = null;
let financeChartInstance = null;
let expensesChartInstance = null;
let sipChartInstance = null;

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA0jHlmQC1T-F2snigSar1-t-GflwQpJ-8",
  authDomain: "wisdomwalker-40e63.firebaseapp.com",
  databaseURL: "https://wisdomwalker-40e63-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wisdomwalker-40e63",
  storageBucket: "wisdomwalker-40e63.firebasestorage.app",
  messagingSenderId: "568917271621",
  appId: "1:568917271621:web:08967643d624f2779daf2c",
  measurementId: "G-ZH58DK07WK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
const analytics = firebase.analytics();

// Check if Firebase Auth is properly configured
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('Firebase Auth is working, user:', user);
    } else {
        console.log('Firebase Auth is working, no user signed in');
    }
}, (error) => {
    console.error('Firebase Auth configuration error:', error);
    if (error.code === 'auth/configuration-not-found') {
        console.warn('Firebase Authentication is not enabled in the project settings.');
        console.warn('Please enable Authentication in Firebase Console:');
        console.warn('1. Go to Firebase Console');
        console.warn('2. Select project: wisdomwalker-40e63');
        console.warn('3. Go to Authentication > Sign-in method');
        console.warn('4. Enable Email/Password sign-in');
    }
});

// Firebase Helper Functions
function firebaseSet(path, data) {
    return database.ref(path).set(data);
}

function firebaseGet(path) {
    return database.ref(path).once('value').then(snapshot => snapshot.val());
}

function firebaseUpdate(path, data) {
    return database.ref(path).update(data);
}

function firebaseRemove(path) {
    return database.ref(path).remove();
}

// User-specific paths
function getUserPath(userId, path) {
    return `users/${userId}/${path}`;
}

function getCurrentUserPath(path) {
    if (!currentUser) return null;
    return getUserPath(currentUser.uid, path);
}

// Helper function to get daily tasks data from Firebase or localStorage
function getDailyTasksData(dateKey, callback) {
    if (currentUser) {
        firebaseGet(getCurrentUserPath(`dailyTasks/${dateKey}`))
            .then(data => {
                callback(data || {});
            })
            .catch(error => {
                console.error('Error getting daily tasks from Firebase:', error);
                // Fallback to localStorage
                const localStorageData = JSON.parse(localStorage.getItem(dateKey)) || {};
                callback(localStorageData);
            });
    } else {
        // Fallback to localStorage
        const localStorageData = JSON.parse(localStorage.getItem(dateKey)) || {};
        callback(localStorageData);
    }
}

// Helper function to get all daily tasks from Firebase
function getAllDailyTasks(callback) {
    if (currentUser) {
        firebaseGet(getCurrentUserPath('dailyTasks'))
            .then(allTasks => {
                callback(allTasks || {});
            })
            .catch(error => {
                console.error('Error getting all daily tasks from Firebase:', error);
                // Fallback to localStorage
                const localStorageData = {};
                for (let i = 0; i < localStorage.length; i++) {
                    let key = localStorage.key(i);
                    if (key !== "user" && key !== "finance" && !key.includes('entriesLog')) {
                        try {
                            localStorageData[key] = JSON.parse(localStorage.getItem(key));
                        } catch {
                            continue;
                        }
                    }
                }
                callback(localStorageData);
            });
    } else {
        // Fallback to localStorage
        const localStorageData = {};
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key !== "user" && key !== "finance" && !key.includes('entriesLog')) {
                try {
                    localStorageData[key] = JSON.parse(localStorage.getItem(key));
                } catch {
                    continue;
                }
            }
        }
        callback(localStorageData);
    }
}

// ─── NEW TASK TRACKER VARIABLES ─────────────────────────────────────
let totalEXP = 0;
let currentLevel = 1;
let dailyStreak = 0;
let weeklyStreak = 0;
let todayEXP = 0;
let todayCoins = 0;
let guiltPenalty = 0;
let avatarMessages = [];
let currentMessageIndex = 0;
let currentUser = null;

// ─── CALENDAR ─────────────────────────────────────────────────────────────────

function renderCalendar() {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    const year = current.getFullYear();
    const month = current.getMonth();

    document.getElementById("monthYear").innerText =
        current.toLocaleString("default", { month: "long", year: "numeric" });

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        calendar.appendChild(document.createElement("div"));
    }

    // Get all daily tasks data for the month
    getAllDailyTasks((allTasksData) => {
        // Day cells - Now using Firebase data
        for (let d = 1; d <= totalDays; d++) {
            let div = document.createElement("div");
            div.classList.add("day");
            div.innerText = d; // Display the date number

            let key = `${year}-${month + 1}-${d}`;

            // Load color from Firebase/localStorage (new format)
            let data = allTasksData[key] || {};
            let taskCount = 0;
            let completedCount = 0;
            
            // Count tasks from new format
            for (let taskKey in data) {
                if (taskKey !== 'guiltLevel' && taskKey !== 'totalEXP' && taskKey !== 'totalCoins' && taskKey !== 'date') {
                    taskCount++;
                    if (data[taskKey] === true) {
                        completedCount++;
                    }
                }
            }
            
            let percent = taskCount > 0 ? (completedCount / taskCount) * 100 : 0;
            
            // Fallback to old format for chart compatibility
            if (taskCount === 0) {
                // Try old format if no new tasks found
                let oldData = JSON.parse(localStorage.getItem(key)) || [];
                if (Array.isArray(oldData) && oldData.length > 0) {
                    let oldDone = oldData.filter(v => v).length;
                    percent = oldData.length ? (oldDone / oldData.length) * 100 : 0;
                }
            }

            if (percent === 0) div.classList.add("red");
            else if (percent < 50) div.classList.add("orange");
            else if (percent < 100) div.classList.add("yellow");
            else div.classList.add("green");

            // Highlight today and style future dates
            let today = new Date();
            const currentDate = new Date(year, month, d);
            today.setHours(0, 0, 0, 0);
            currentDate.setHours(0, 0, 0, 0);
            
            if (
                d === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear()
            ) {
                div.style.border = "2px solid white";
            }
            
            // Make future dates black/dark grey
            if (currentDate > today) {
                div.style.background = "#2a2a2a";
                div.style.color = "#888";
                div.style.border = "1px solid #444";
            }

            div.onclick = () => openDay(key, year, month, d);
            calendar.appendChild(div);
        }

        drawGraph();
    });
}

// ─── CHANGE MONTH ─────────────────────────────────────────────────────────────

function changeMonth(val) {
    current.setMonth(current.getMonth() + val);
    renderCalendar();
}

// ─── 3D DAILY TASKS TAB ─────────────────────────────────────────────────

function updateDailyTasksButton() {
    // Set today's date in mmm-dd-yyyy format
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
    });
    
    // Update button text
    const dailyTasksBtn = document.getElementById("dailyTasksBtn");
    if (dailyTasksBtn) {
        dailyTasksBtn.innerText = formattedDate;
    }
    
    return formattedDate;
}

function openDailyTasksTab() {
    // Update button date
    const formattedDate = updateDailyTasksButton();
    
    // Update tab date
    const tabDateElement = document.getElementById("tabDate");
    if (tabDateElement) {
        tabDateElement.innerText = formattedDate;
    }
    
    // Show tab
    const tab = document.getElementById("dailyTasksTab");
    tab.classList.remove("hidden");
    document.body.classList.add("modal-open");
    document.body.classList.add("daily-tasks-open"); // Add this class to prevent blur
    
    // Load today's tasks
    loadTodayTasks();
    
    // Update experience bar
    updateExperienceBar();
}

function closeDailyTasksTab() {
    // Hide the tab
    const tab = document.getElementById("dailyTasksTab");
    tab.classList.add("hidden");
    if (tab) {
        tab.classList.add("hidden");
    }
    document.body.classList.remove("modal-open");
    document.body.classList.remove("daily-tasks-open"); 
}

function saveDailyTasksFromTab() {
    try {
        console.log('saveDailyTasksFromTab called');
        
        // Verify tab exists before proceeding
        const tab = document.getElementById("dailyTasksTab");
        if (!tab) {
            console.error('Daily tasks tab not found');
            alert('Daily tasks tab not found. Please try again.');
            return;
        }
        
        // Save the tasks (reuse existing saveDailyTasks logic)
        saveDailyTasks();
        
        // Close the tab after a short delay to show success message
        setTimeout(() => {
            closeDailyTasksTab();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving daily tasks:', error);
        alert('Error saving tasks: ' + error.message);
    }
}

// ─── OPEN DAILY ENTRIES ──────────────────────────────────────────────────

function openDailyEntries() {
    document.getElementById("dailyEntries").classList.remove("hidden");
    document.getElementById("taskApp").classList.add("modal-open");
    
    // Set today's date
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
    });
    document.getElementById("todayDate").innerText = formattedDate;
    
    // Load today's tasks if they exist
    loadTodayTasks();
    
    // Update experience bar and level
    updateExperienceBar();
    
    // Hide calendar and other elements
    document.getElementById("calendar").style.display = "none";
    document.getElementById("calendarHeader").style.display = "none";
    document.getElementById("calendarDays").style.display = "none";
    document.getElementById("chart").style.display = "none";
}

function closeDailyEntries() {
    document.getElementById("dailyEntries").classList.add("hidden");
    document.getElementById("taskApp").classList.remove("modal-open");
    
    // Show calendar and other elements again
    document.getElementById("calendar").style.display = "grid";
    document.getElementById("calendarHeader").style.display = "flex";
    document.getElementById("calendarDays").style.display = "grid";
    document.getElementById("chart").style.display = "block";
}

function loadTodayTasks() {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    if (currentUser) {
        // Try to get data from Firebase first
        firebaseGet(getCurrentUserPath(`dailyTasks/${todayKey}`))
            .then(savedData => {
                if (savedData) {
                    loadTasksFromData(savedData);
                } else {
                    // Fallback to localStorage
                    let localStorageData = {};
                    try {
                        localStorageData = JSON.parse(localStorage.getItem(todayKey)) || {};
                    } catch (parseError) {
                        console.warn('Invalid data in localStorage for today:', parseError);
                        localStorageData = {};
                    }
                    loadTasksFromData(localStorageData);
                }
                calculateTodayEXP();
            })
            .catch(error => {
                console.error('Error loading daily tasks from Firebase:', error);
                // Fallback to localStorage
                let localStorageData = {};
                try {
                    localStorageData = JSON.parse(localStorage.getItem(todayKey)) || {};
                } catch (parseError) {
                    console.warn('Invalid data in localStorage for today:', parseError);
                    localStorageData = {};
                }
                loadTasksFromData(localStorageData);
                calculateTodayEXP();
            });
    } else {
        // Fallback to localStorage if no current user
        let savedData = {};
        try {
            savedData = JSON.parse(localStorage.getItem(todayKey)) || {};
        } catch (parseError) {
            console.warn('Invalid data in localStorage for today:', parseError);
            savedData = {};
        }
        loadTasksFromData(savedData);
        calculateTodayEXP();
    }
}

function loadTasksFromData(savedData) {
    // ...
    // Load task checkboxes
    const tasks = document.querySelectorAll('.daily-task');
    tasks.forEach(task => {
        // Get the task text more precisely - remove the checkbox and any extra whitespace
        const label = task.parentElement;
        const taskText = label.textContent.replace(task.checked ? '?' : '?', '').trim();
        
        // Sanitize task name to match Firebase keys
        const sanitizedTaskName = taskText.replace(/[.#$\[\]\/]/g, '_');
        
        // Check both sanitized and original task names for backward compatibility
        task.checked = savedData[sanitizedTaskName] || savedData[taskText] || false;
    });
    
    // Load guilt level
    const guiltLevel = savedData.guiltLevel || "";
    document.getElementById('guiltLevel').value = guiltLevel;
}

function saveDailyTasks() {
    try {
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        
        // Get task data
        const tasks = document.querySelectorAll('.daily-task');
        const taskData = {};
        let totalEXP = 0;
        let totalCoins = 0;
        
        console.log('Found tasks:', tasks.length);
        
        tasks.forEach((task, index) => {
            if (!task) return;
            
            console.log('Processing task', index, ':', task.checked);
            
            // Get task text - use a simple approach
            const label = task.parentElement;
            let taskText = '';
            
            if (label) {
                // Get the full text content
                const fullText = label.textContent || label.innerText || '';
                
                // Remove common checkbox indicators and clean up
                taskText = fullText
                    .replace(/^[\s\u2713\u2717\u25cb\u25cf]*\s*/, '') // Remove checkbox symbols
                    .replace(/\s*\(\d+EXP\s*&\s*\d+Coins\)\s*$/, '') // Remove EXP/Coins suffix
                    .replace(/\s*\d+EXP\s*&\s*\d+Coins\s*$/, '') // Remove alternative EXP/Coins suffix
                    .trim();
            }
            
            // If still empty, use a fallback
            if (!taskText) {
                taskText = `Task ${index + 1}`;
            }
            
            console.log('Task text:', taskText, 'Checked:', task.checked);
            
            const isChecked = task.checked;
            const exp = parseInt(task.dataset.exp) || 10;
            const coins = parseInt(task.dataset.coins) || 5;
            
            // Sanitize task name for Firebase key (remove invalid characters)
            const sanitizedTaskName = taskText.replace(/[.#$\[\]\/]/g, '_');
            taskData[sanitizedTaskName] = isChecked;
            
            if (isChecked) {
                totalEXP += exp;
                totalCoins += coins;
            }
        });
        
        console.log('Task data:', taskData);
        console.log('Total EXP:', totalEXP, 'Total Coins:', totalCoins);
        
        // Get guilt penalty
        const guiltLevelSelect = document.getElementById('guiltLevel');
        const guiltLevel = guiltLevelSelect ? guiltLevelSelect.value : "";
        let guiltPenalty = 0;
        if (guiltLevel === 'low') guiltPenalty = 5;
        else if (guiltLevel === 'mid') guiltPenalty = 10;
        else if (guiltLevel === 'high') guiltPenalty = 15;
        
        // Apply guilt penalty
        totalCoins = Math.max(0, totalCoins - guiltPenalty);
        
        // Save to Firebase
        taskData.guiltLevel = guiltLevel;
        taskData.totalEXP = totalEXP;
        taskData.totalCoins = totalCoins;
        taskData.date = todayKey;
        
        if (currentUser) {
            console.log('Saving to Firebase:', todayKey, taskData);
            firebaseSet(getCurrentUserPath(`dailyTasks/${todayKey}`), taskData)
                .then(() => {
                    console.log('Daily tasks saved to Firebase successfully');
                    
                    // Update global tracking
                    if (typeof updateGlobalTracking === 'function') {
                        updateGlobalTracking(totalEXP, totalCoins, guiltPenalty);
                    }
                    
                    // Update all UI elements live AFTER Firebase save completes
                    if (typeof updateTotalCoins === 'function') {
                        updateTotalCoins();
                    }
                    if (typeof renderCalendar === 'function') {
                        renderCalendar();
                    }
                    if (typeof drawGraph === 'function') {
                        drawGraph();
                    }
                    if (typeof updateExperienceBar === 'function') {
                        updateExperienceBar();
                    }
                })
                .catch(error => {
                    console.error('Error saving daily tasks to Firebase:', error);
                    // Fallback to localStorage
                    localStorage.setItem(todayKey, JSON.stringify(taskData));
                    
                    // Update UI even if Firebase failed
                    if (typeof updateGlobalTracking === 'function') {
                        updateGlobalTracking(totalEXP, totalCoins, guiltPenalty);
                    }
                    if (typeof updateTotalCoins === 'function') {
                        updateTotalCoins();
                    }
                    if (typeof renderCalendar === 'function') {
                        renderCalendar();
                    }
                    if (typeof drawGraph === 'function') {
                        drawGraph();
                    }
                    if (typeof updateExperienceBar === 'function') {
                        updateExperienceBar();
                    }
                });
        } else {
            // Fallback to localStorage if no current user
            console.log('No current user, saving to localStorage:', todayKey, taskData);
            localStorage.setItem(todayKey, JSON.stringify(taskData));
            
            // Update global tracking
            if (typeof updateGlobalTracking === 'function') {
                updateGlobalTracking(totalEXP, totalCoins, guiltPenalty);
            }
            
            // Update all UI elements live
            if (typeof updateTotalCoins === 'function') {
                updateTotalCoins();
            }
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }
            if (typeof drawGraph === 'function') {
                drawGraph();
            }
            if (typeof updateExperienceBar === 'function') {
                updateExperienceBar();
            }
        }
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 170, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        successMsg.textContent = 'Daily tasks saved successfully!';
        document.body.appendChild(successMsg);
        
        // Remove success message after 2 seconds
        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.parentNode.removeChild(successMsg);
            }
        }, 2000);
        
        console.log('Save completed successfully');
        
    } catch (error) {
        console.error('Error in saveDailyTasks:', error);
        alert('Error saving tasks: ' + error.message);
        throw error;
    }
}

function calculateTodayEXP() {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    let savedData = {};
    try {
        savedData = JSON.parse(localStorage.getItem(todayKey)) || {};
    } catch (error) {
        console.warn('Invalid data in localStorage for today:', error);
        savedData = {};
    }
    
    let totalEXP = 0;
    const tasks = document.querySelectorAll('.daily-task');
    tasks.forEach(task => {
        if (task.checked) {
            totalEXP += parseInt(task.dataset.exp) || 0;
        }
    });
    
    // Calculate cumulative EXP
    let cumulativeEXP = 0;
    const allDays = Object.keys(localStorage).filter(key => !key.includes('entriesLog') && !key.includes('user') && !key.includes('finance'));
    allDays.forEach(dayKey => {
        try {
            const dayData = JSON.parse(localStorage.getItem(dayKey)) || {};
            if (dayData.totalEXP) {
                cumulativeEXP += dayData.totalEXP;
            }
        } catch (error) {
            console.warn('Skipping invalid data for key:', dayKey, error);
            // Skip invalid JSON data
        }
    });
    
    // Update cumulative EXP display
    const cumulativeEXPElement = document.getElementById('cumulativeEXP');
    if (cumulativeEXPElement) {
        cumulativeEXPElement.textContent = cumulativeEXP;
    }
}

function updateGlobalTracking(exp, coins, penalty) {
    // Update global EXP and coins tracking
    totalEXP += exp;
    todayEXP = exp;
    todayCoins = coins;
    guiltPenalty = penalty;
}

function getTotalCoins() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key === "user" || key === "finance") continue;
        
        let data;
        try {
            data = JSON.parse(localStorage.getItem(key));
        } catch {
            continue;
        }
        
        if (data && data.totalCoins) {
            total += data.totalCoins;
        }
    }
    return total;
}

function getNetWorth() {
    let data = JSON.parse(localStorage.getItem("finance")) || [];
    let netWorth = 0;
    
    data.forEach(d => {
        if (d.type === "income") {
            netWorth += d.amount;
        } else if (d.type === "expense") {
            netWorth -= d.amount;
        } else if (d.type === "savings") {
            if (d.action === "sell") {
                netWorth += d.amount;
            } else {
                netWorth -= d.amount;
            }
        }
    });
    
    return netWorth;
}

function calculateStreaks() {
    // This is a simplified streak calculation
    // In a full implementation, we would track consecutive days and calculate bonuses
    dailyStreak = 1; // Placeholder
    weeklyStreak = 1; // Placeholder
}

// ─── OPEN DAY ─────────────────────────────────────────────────

function openDay(key, year, month, day) {
    // Use the same format for all dates - show past date details modal
    showPastDateDetails(key, year, month, day);
}

function showPastDateDetails(key, year, month, day) {
    const selectedDate = new Date(year, month, day);
    const formattedDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Set modal title
    document.getElementById("pastDateTitle").textContent = formattedDate;
    
    // Load data for that date
    let dayData = {};
    try {
        dayData = JSON.parse(localStorage.getItem(key)) || {};
    } catch (error) {
        console.warn('Invalid data in localStorage for date:', key, error);
        dayData = {};
    }
    
    // Calculate coins and EXP
    let totalCoins = dayData.totalCoins || 0;
    let totalEXP = dayData.totalEXP || 0;
    
    document.getElementById("pastDateCoins").textContent = totalCoins;
    document.getElementById("pastDateEXP").textContent = totalEXP;
    
    // Separate achieved and unaccomplished tasks
    const achievedTasks = [];
    const unaccomplishedTasks = [];
    
    for (let taskKey in dayData) {
        if (taskKey !== 'guiltLevel' && taskKey !== 'totalEXP' && taskKey !== 'totalCoins' && taskKey !== 'date') {
            if (dayData[taskKey] === true) {
                achievedTasks.push(taskKey);
            } else {
                unaccomplishedTasks.push(taskKey);
            }
        }
    }
    
    // Display achieved tasks
    const achievedContainer = document.getElementById("achievedTasks");
    achievedContainer.innerHTML = "";
    achievedTasks.forEach(task => {
        const label = document.createElement("label");
        label.style.cssText = `
            display: block;
            margin: 8px 0;
            padding: 8px 12px;
            background: rgba(0, 255, 170, 0.1);
            border-radius: 8px;
            cursor: default;
        `;
        label.innerHTML = `&#10004; ${task}`;
        achievedContainer.appendChild(label);
    });
    
    // Display unaccomplished tasks
    const unaccomplishedContainer = document.getElementById("unaccomplishedTasks");
    unaccomplishedContainer.innerHTML = "";
    unaccomplishedTasks.forEach(task => {
        const label = document.createElement("label");
        label.style.cssText = `
            display: block;
            margin: 8px 0;
            padding: 8px 12px;
            background: rgba(255, 100, 100, 0.1);
            border-radius: 8px;
            cursor: default;
        `;
        label.innerHTML = `&#10006; ${task}`;
        unaccomplishedContainer.appendChild(label);
    });
    
    // Show modal
    document.getElementById("pastDateModal").classList.remove("hidden");
    document.body.classList.add("modal-open");
}

function closePastDateModal() {
    document.getElementById("pastDateModal").classList.add("hidden");
    document.body.classList.remove("modal-open");
}

// ─── FLOATING AVATAR ──────────────────────────────────────────────────
function initializeAvatar() {
    const avatar = document.getElementById("centerAvatar");
    const speech = document.getElementById("avatarSpeech");
    
    if (!avatar || !speech) return;
    
    // Set up avatar messages
    avatarMessages = [
        "What did you conquer today in your pursuit of wisdom?",
        `You stand at Stage ${currentLevel} on your path to ultimate wisdom - do you have what it takes to reach the top?`,
        `Current Battle Fund: ${getTotalCoins()} - every coin counts on this journey`,
        `Net Worth: ${getNetWorth()} - your financial foundation for wisdom`
    ];
    
    // Position avatar based on current screen
    const homeScreen = document.getElementById("homeScreen");
    if (homeScreen.classList.contains("hidden")) {
        // Hide avatar on task tracker and finance tracker
        avatar.classList.add("hidden");
        speech.classList.add("hidden");
    } else {
        // Show avatar only on home screen - center with fade in
        avatar.classList.remove("hidden");
        speech.classList.remove("hidden");
        avatar.style.position = "fixed";
        avatar.style.top = "50%";
        avatar.style.left = "50%";
        avatar.style.transform = "translate(-50%, -50%)";
        avatar.style.zIndex = "500";
        avatar.style.pointerEvents = "none";
        
        // Position speech bubble above avatar
        speech.style.position = "fixed";
        speech.style.top = "35%";
        speech.style.left = "50%";
        speech.style.transform = "translate(-50%, -50%)";
        speech.style.zIndex = "501";
        speech.style.pointerEvents = "none";
        
        // Start fade in animation and text rotation
        avatar.style.opacity = "0";
        avatar.style.transform = "translate(-50%, -50%) scale(0.8)";
        speech.style.opacity = "0";
        speech.style.transform = "translate(-50%, -50%) scale(0.9)";
        
        setTimeout(() => {
            avatar.style.opacity = "1";
            avatar.style.transform = "translate(-50%, -50%) scale(1)";
            speech.style.opacity = "1";
            speech.style.transform = "translate(-50%, -50%) scale(1)";
        }, 300);
        
        // Start rotating messages on home screen
        startHomeScreenAvatarRotation();
    }
}

function startHomeScreenAvatarRotation() {
    const speech = document.getElementById("avatarSpeech");
    if (!speech) return;
    
    // Check if we're still on home screen
    const homeScreen = document.getElementById("homeScreen");
    if (homeScreen.classList.contains("hidden")) {
        return; // Stop rotation if not on home screen
    }
    
    // Show current message with smooth fade in
    speech.style.opacity = "0";
    speech.style.transform = "scale(0.9)";
    speech.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    
    setTimeout(() => {
        speech.textContent = avatarMessages[currentMessageIndex];
        speech.style.opacity = "1";
        speech.style.transform = "scale(1)";
    }, 300);
    
    // Rotate to next message after 3 seconds
    setTimeout(() => {
        currentMessageIndex = (currentMessageIndex + 1) % avatarMessages.length;
        startHomeScreenAvatarRotation();
    }, 3000);
}

function rotateAvatarMessages() {
    const avatar = document.getElementById("centerAvatar");
    const speech = document.getElementById("avatarSpeech");
    
    if (!avatar || !speech) return;
    
    // Check if we're on home screen - if so, don't rotate
    const homeScreen = document.getElementById("homeScreen");
    if (!homeScreen.classList.contains("hidden")) {
        return; // Don't rotate on home screen
    }
    
    // Show current message with smooth fade in
    speech.textContent = avatarMessages[currentMessageIndex];
    speech.style.opacity = "0";
    speech.style.transform = "scale(0.8)";
    speech.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    
    // Fade in animation
    setTimeout(() => {
        speech.style.opacity = "1";
        speech.style.transform = "scale(1)";
    }, 100);
    
    // Rotate to next message after 2 seconds
    setTimeout(() => {
        currentMessageIndex = (currentMessageIndex + 1) % avatarMessages.length;
        rotateAvatarMessages();
    }, 2000);
}

function openTasks() {
    showAvatarMessage("tasks");

    setTimeout(() => {
        document.getElementById("homeScreen").classList.add("hidden");
        document.getElementById("taskApp").classList.remove("hidden");

        // Ensure calendar and chart elements are visible
        document.getElementById("calendar").style.display = "grid";
        document.getElementById("calendarHeader").style.display = "flex";
        document.getElementById("calendarDays").style.display = "grid";
        document.getElementById("chart").style.display = "block";

        // Update user name display with signup name
        const userName = localStorage.getItem('userName') || 'User';
        let userNameDisplay = document.getElementById("userName");
        if (userNameDisplay) {
            userNameDisplay.innerText = userName.toUpperCase();
        }

        // Update daily tasks button with today's date
        updateDailyTasksButton();

        renderCalendar();
        updateTotalCoins();
        updateExperienceBar();
        initializeAvatar();
        loadTodayTasks();
        drawGraph();
    }, 2000);

    // Start avatar rotation immediately after task tracker loads
    startTaskTrackerAvatarRotation();
}

function updateExperienceBar() {
    // Calculate total EXP from all days using Firebase
    getAllDailyTasks((allTasksData) => {
        let totalEXP = 0;
        
        for (let key in allTasksData) {
            const dayData = allTasksData[key];
            if (dayData.totalEXP) {
                totalEXP += dayData.totalEXP;
            }
        }
        
        // Define level system with 10 levels
        const levels = [
            { name: "Rookie", symbol: "", minExp: 0, maxExp: 500 },
            { name: "Explorer", symbol: "", minExp: 501, maxExp: 1500 },
            { name: "Achiever", symbol: "", minExp: 1501, maxExp: 3500 },
            { name: "Challenger", symbol: "", minExp: 3501, maxExp: 7000 },
            { name: "Specialist", symbol: "", minExp: 7001, maxExp: 15000 },
            { name: "Expert", symbol: "", minExp: 15001, maxExp: 25000 },
            { name: "Virtuoso", symbol: "", minExp: 25001, maxExp: 40000 },
            { name: "Champion", symbol: "", minExp: 40001, maxExp: 60000 },
            { name: "Legend", symbol: "", minExp: 60001, maxExp: 999999 }
        ];
        
        // Determine current level based on total EXP
        let currentLevel = 1;
        let expForNextLevel = 500;
        let currentLevelEXP = 0;
        
        for (let i = 0; i < levels.length; i++) {
            if (totalEXP >= levels[i].minExp) {
                currentLevel = i + 1;
                expForNextLevel = levels[i].maxExp + 1;
                currentLevelEXP = totalEXP - levels[i].minExp;
            } else {
                break;
            }
        }
        
        // Update level display with name and symbol
        const levelDisplay = document.getElementById('userLevelDisplay');
        if (levelDisplay) {
            const currentLevelData = levels[currentLevel - 1];
            levelDisplay.innerHTML = `${currentLevelData.symbol} ${currentLevelData.name} - Level ${currentLevel}`;
        }
        
        // Update EXP bar with animation
        const expBar = document.getElementById('expBar');
        if (expBar) {
            const percentage = (currentLevelEXP / expForNextLevel) * 100;
            
            // Add animation class
            expBar.classList.add('exp-bar-animated');
            
            // Set initial width to 0 for animation
            expBar.style.width = '0%';
            
            // Animate to current percentage
            setTimeout(() => {
                expBar.style.width = percentage + '%';
            }, 100);
            
            // Add hover events for EXP popup
            expBar.addEventListener('mouseenter', showEXPPopup);
            expBar.addEventListener('mouseleave', hideEXPPopup);
        }
        
        // Update EXP progress display
        const expProgressDisplay = document.getElementById('expProgressDisplay');
        if (expProgressDisplay) {
            const currentLevelData = levels[currentLevel - 1];
            expProgressDisplay.textContent = `${currentLevelEXP} / ${currentLevelData.maxExp}`;
        }
        
        // Update current level variable
        currentLevel = currentLevel;
    });
}

// ─── EXP POPUP FUNCTIONS ───────────────────────────────────────────────────

function showEXPPopup(event) {
    // Calculate current EXP
    let totalEXP = 0;
    const allDays = Object.keys(localStorage).filter(key => !key.includes('entriesLog') && key !== 'user' && key !== 'finance');
    allDays.forEach(dayKey => {
        const dayData = JSON.parse(localStorage.getItem(dayKey)) || {};
        if (dayData.totalEXP) {
            totalEXP += dayData.totalEXP;
        }
    });
    
    // Create or update popup
    let popup = document.getElementById('expPopup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'expPopup';
        popup.className = 'exp-popup';
        document.getElementById('expBarWrapper').appendChild(popup);
    }
    
    // Update popup content
    popup.textContent = `Current EXP: ${totalEXP}`;
    popup.classList.add('show');
}

function hideEXPPopup() {
    const popup = document.getElementById('expPopup');
    if (popup) {
        popup.classList.remove('show');
    }
}

function getFirstTimeToday() {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const savedData = JSON.parse(localStorage.getItem(todayKey));
    
    // Check if user has already logged in today
    return savedData === null || Object.keys(savedData).length === 0;
}

// ─── CLOSE POPUP ──────────────────────────────────────────────────────────────

function closePopup() {
    document.getElementById("taskPopup").classList.add("hidden");
}

// ─── SAVE TASKS ───────────────────────────────────────────────────────────────

function saveTasks() {
    let tasks = document.querySelectorAll(".task");
    let values = [];

    tasks.forEach(t => values.push(t.checked));

    // Save to localStorage only
    localStorage.setItem(selectedKey, JSON.stringify(values));

    calculate(values);
    renderCalendar();
    closePopup();
    updateTotalCoins();
    renderFinanceLedger();
}

// ─── LOAD TASKS ───────────────────────────────────────────────────────────────

function loadTasks() {
    // Load from localStorage only
    let saved = JSON.parse(localStorage.getItem(selectedKey)) || [];

    let tasks = document.querySelectorAll(".task");
    tasks.forEach((t, i) => (t.checked = saved[i] || false));

    calculate(saved);
}

// ─── SCORE & COINS ────────────────────────────────────────────────────────────

function calculate(values) {
    let total = values.length;
    let done = values.filter(v => v).length;
    let percent = Math.round((done / total) * 100) || 0;

    document.getElementById("score").innerText = "Score: " + percent + "%";

    let coins = 0;
    if (percent === 0)        coins = 0;
    else if (percent <= 25)   coins = 5;
    else if (percent <= 50)   coins = 10;
    else if (percent <= 75)   coins = 15;
    else if (percent < 100)   coins = 20;
    else                      coins = 30;

    document.getElementById("coins").innerText = "Coins: " + coins;
}

// ─── GRAPH ────────────────────────────────────────────────────────────────────

function drawGraph() {
    let year = current.getFullYear();
    let month = current.getMonth();
    let totalDays = new Date(year, month + 1, 0).getDate();

    // Get all daily tasks data for the month
    getAllDailyTasks((allTasksData) => {
        let labels = [];
        let data = [];

        for (let d = 1; d <= totalDays; d++) {
            let key = `${year}-${month + 1}-${d}`;

            // Get data from Firebase/localStorage and handle both old and new formats
            let saved = allTasksData[key];
            let percent = 0;
            
            // Handle null/undefined data
            if (!saved) {
                percent = 0;
            }
            // Check if it's new format (object with task data)
            else if (typeof saved === 'object' && !Array.isArray(saved)) {
                let taskCount = 0;
                let completedCount = 0;
                
                for (let taskKey in saved) {
                    if (taskKey !== 'guiltLevel' && taskKey !== 'totalEXP' && taskKey !== 'totalCoins' && taskKey !== 'date') {
                        taskCount++;
                        if (saved[taskKey] === true) {
                            completedCount++;
                        }
                    }
                }
                
                percent = taskCount > 0 ? (completedCount / taskCount) * 100 : 0;
            } 
            // Check if it's old format (array)
            else if (Array.isArray(saved)) {
                let done = saved.filter(v => v).length;
                percent = saved.length ? (done / saved.length) * 100 : 0;
            }

            labels.push(d);
            data.push(percent);
        }

        // Destroy existing chart instance if it exists
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        const canvas = document.getElementById("chart");
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        
        // Only create new chart if we have valid data
        if (labels.length > 0 && data.length > 0) {
            chartInstance = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Progress %",
                        data: data,
                        borderColor: "#00ffaa",
                        backgroundColor: "rgba(0, 255, 170, 0.1)",
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            max: 100,
                            ticks: {
                                color: "white"
                            },
                            grid: {
                                color: "rgba(255, 255, 255, 0.1)"
                            }
                        },
                        x: {
                            ticks: {
                                color: "white"
                            },
                            grid: {
                                color: "rgba(255, 255, 255, 0.1)"
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: "white"
                            }
                        }
                    }
                }
            });
        }
    });
}

// ─── TOTAL COINS ──────────────────────────────────────────────────────────────

function updateTotalCoins() {
    getAllDailyTasks((allTasksData) => {
        let total = 0;

        for (let key in allTasksData) {
            let data = allTasksData[key];
            
            // Handle new format (object with totalCoins property)
            if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                if (data.totalCoins) {
                    total += data.totalCoins;
                }
            }
            // Handle old format (array)
            else if (Array.isArray(data)) {
                let done = data.filter(v => v).length;
                let percent = data.length ? (done / data.length) * 100 : 0;

                if (percent === 0)        total += 0;
                else if (percent <= 25)   total += 5;
                else if (percent <= 50)   total += 10;
                else if (percent <= 75)   total += 15;
                else if (percent < 100)   total += 20;
                else                      total += 30;
            }
        }

        const totalCoinsElement = document.getElementById("totalCoinsDisplay");
        if (totalCoinsElement) {
            totalCoinsElement.innerText = total;
        }
    });
}

// ─── USER SYSTEM ──────────────────────────────────────────────────────────────

function checkUser() {
    // Always show login interface on app launch
    currentUser = null;
    
    // Hide all main screens
    document.getElementById("homeScreen").classList.add("hidden");
    document.getElementById("taskApp").classList.add("hidden");
    document.getElementById("financeApp").classList.add("hidden");
    
    // Clear any stored session data to force login
    localStorage.removeItem('userUid');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    
    // Show login popup
    showLogin();
}

// Logout function to force login on next visit
function logoutUser() {
    // Clear Firebase session if available
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => {
            console.log('User signed out from Firebase');
        }).catch((error) => {
            console.error('Error signing out from Firebase:', error);
        });
    }
    
    // Clear all local storage session data
    localStorage.removeItem('userUid');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    
    // Clear current user
    currentUser = null;
    
    // Hide all main screens
    document.getElementById("homeScreen").classList.add("hidden");
    document.getElementById("taskApp").classList.add("hidden");
    document.getElementById("financeApp").classList.add("hidden");
    
    // Show login interface
    showLogin();
}

function saveUser() {
    let name = document.getElementById("nameInput").value.trim();

    if (!name) {
        alert("Please enter your name");
        return;
    }

    // Create user with unique ID
    let userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    let user = { 
        uid: userId,
        name: name,
        createdAt: new Date().toISOString()
    };
    
    currentUser = user;

    // Save to Firebase
    firebaseSet(getUserPath(userId, 'profile'), user)
        .then(() => {
            console.log('User saved to Firebase');
            document.getElementById("userPopup").classList.add("hidden");
            closeWelcome(); // Close the welcome popup too
            greetUser(user);
        })
        .catch(error => {
            console.error('Error saving user:', error);
            // Fallback to localStorage
            localStorage.setItem("user", JSON.stringify(user));
            document.getElementById("userPopup").classList.add("hidden");
            closeWelcome();
            greetUser(user);
        });
}

function greetUser(user) {
    let avatar = document.getElementById("centerAvatar");
    let speech = document.getElementById("avatarSpeech");
    let userNameDisplay = document.getElementById("userName");

    // Get the user's name from signup
    const userName = localStorage.getItem('userName') || user.name || 'User';

    // Update user name display in EXP bar container
    if (userNameDisplay) {
        userNameDisplay.innerText = userName.toUpperCase();
    }

    avatar.classList.remove("hidden");
    speech.innerText = `Hi ${userName}! Where would you like to go?\n\nTasks  or  Finance`;

    setTimeout(() => {
        avatar.classList.add("hidden");
    }, 2500);
}

// Mobile Navigation Function
function toggleMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav) {
        mobileNav.classList.toggle('active');
    }
}

function toggleChat() {
    document.getElementById("chatBox").classList.toggle("hidden");
}

function sendMessage() {
    let input = document.getElementById("userInput");
    let message = input.value.trim();
    let avatar = document.getElementById("avatar");

    // React animation
    avatar.style.transform = "scale(1.2)";
    setTimeout(() => {
        avatar.style.transform = "scale(1)";
    }, 300);

    if (!message) return;

    addMessage("You: " + message);

    let reply = getAIResponse(message);
    setTimeout(() => addMessage("AI: " + reply), 400);

    input.value = "";
}

function addMessage(msg) {
    let div = document.createElement("div");
    div.innerText = msg;

    let chat = document.getElementById("chatMessages");
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function getAIResponse(msg) {
    msg = msg.toLowerCase();
    let user = JSON.parse(localStorage.getItem("user")) || {};

    if (msg.includes("hello") || msg.includes("hi"))
        return "Hello " + (user.name || "there") + " 👋";

    if (msg.includes("motivate"))
        return "Discipline beats motivation. Keep going 💪";

    if (msg.includes("progress"))
        return "You're building momentum 🔥";

    if (msg.includes("lazy"))
        return "Start small. Action creates motivation ⚡";

    return "I'm learning... ask me more 😊";
}

// ─── HISTORY PANEL - FIX: Toggle functionality ────────────────────────────────

function toggleHistory() {
    let panel = document.getElementById("historyPanel");
    if (panel.classList.contains("hidden")) {
        panel.classList.remove("hidden");
        loadHistory();
    } else {
        panel.classList.add("hidden");
    }
}

function loadHistory() {
    let tbody = document.getElementById("historyBody");
    
    if (!tbody) return;
    
    tbody.innerHTML = "";

    // Get all daily tasks from Firebase
    getAllDailyTasks((allTasksData) => {
        let keys = Object.keys(allTasksData)
            .filter(k => k !== "user" && k !== "finance")
            .sort((a, b) => new Date(b) - new Date(a));

        keys.forEach(key => {
            let data = allTasksData[key];

            let dateObj = new Date(key);
            let formattedDate = dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric"
            });

            let tasksAccomplished = "";
            let totalEXP = 0;
            let totalCoins = 0;

            // Handle new format (object with task data)
            if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                let completedTasks = [];
                let taskCount = 0;
                
                for (let taskKey in data) {
                    if (taskKey !== 'guiltLevel' && taskKey !== 'totalEXP' && taskKey !== 'totalCoins' && taskKey !== 'date') {
                        taskCount++;
                        if (data[taskKey] === true) {
                            completedTasks.push(taskKey);
                        }
                    }
                }
                
                tasksAccomplished = completedTasks.length > 0 ? completedTasks.join(", ") : "No tasks completed";
                totalEXP = data.totalEXP || 0;
                totalCoins = data.totalCoins || 0;
            }
            // Handle old format (array)
            else if (Array.isArray(data)) {
                let done = data.filter(v => v).length;
                let total = data.length;
                let percent = total ? Math.round((done / total) * 100) : 0;

                tasksAccomplished = `${done}/${total} tasks completed`;
                
                // Calculate coins based on percentage
                if (percent === 0)        totalCoins = 0;
                else if (percent <= 25)   totalCoins = 5;
                else if (percent <= 50)   totalCoins = 10;
                else if (percent <= 75)   totalCoins = 15;
                else if (percent < 100)   totalCoins = 20;
                else                      totalCoins = 30;
                
                // Estimate EXP (rough calculation)
                totalEXP = done * 10; // Rough estimate: 10 EXP per task
            }

            // Create table row
            let row = document.createElement("tr");
            
            // Style based on performance
            if (totalCoins === 0) {
                row.style.background = "rgba(255, 77, 77, 0.2)";
            } else if (totalCoins <= 10) {
                row.style.background = "rgba(255, 153, 51, 0.2)";
            } else if (totalCoins <= 20) {
                row.style.background = "rgba(255, 224, 102, 0.2)";
            } else {
                row.style.background = "rgba(0, 204, 102, 0.2)";
            }

            row.innerHTML = `
                <td style="color: #00ffaa; font-weight: bold;">${formattedDate}</td>
                <td style="color: white;">${tasksAccomplished}</td>
                <td style="color: #ffa500; font-weight: bold;">${totalEXP}</td>
                <td style="color: #ffd700; font-weight: bold;">${totalCoins}</td>
            `;

            tbody.appendChild(row);
        });

        // If no entries, show message
        if (keys.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #ccc;">
                        No history found. Start completing tasks to see your progress here!
                    </td>
                </tr>
            `;
        }
    });
}

function closeHistory() {
    document.getElementById("historyPanel").classList.add("hidden");
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

function openFinance() {
    // Hide avatar immediately when switching to finance
    const avatar = document.getElementById("centerAvatar");
    const speech = document.getElementById("avatarSpeech");
    if (avatar) {
        avatar.classList.add("hidden");
    }
    if (speech) {
        speech.classList.add("hidden");
    }

    setTimeout(() => {
        document.getElementById("homeScreen").classList.add("hidden");
        document.getElementById("financeApp").classList.remove("hidden");

        // Call everything directly (no dependency confusion)
        calculateFinance();
        renderSummaryTable();
        renderExpenseTable();
        renderFinanceLedger();
        drawFinanceChart();
        drawExpensesChart();
        drawSIPChart();
        renderEntriesLog(); // Add this to refresh entries log
    }, 2000);
}

function loadFinance() {
    calculateFinance();
    renderSummaryTable();
    renderExpenseTable();
    drawFinanceChart();
    drawExpensesChart();
    drawSIPChart();
}

function goHome() {
    document.getElementById("taskApp").classList.add("hidden");
    document.getElementById("financeApp").classList.add("hidden");
    document.getElementById("homeScreen").classList.remove("hidden");
    
    // Reinitialize avatar for proper home screen positioning
    initializeAvatar();
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

function openSettings() {
    document.getElementById("settingsPanel").classList.remove("hidden");
}

function closeSettings() {
    document.getElementById("settingsPanel").classList.add("hidden");
}

function openEntriesLog() {
    document.getElementById("entriesLogPanel").classList.remove("hidden");
    renderEntriesLog();
}

function closeEntriesLog() {
    document.getElementById("entriesLogPanel").classList.add("hidden");
}

function renderEntriesLog() {
    let data = JSON.parse(localStorage.getItem("finance")) || [];
    let tbody = document.getElementById("entriesLogBody");
    
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    // Sort entries by entry date/time (newest first)
    let sortedData = data.sort((a, b) => {
        let dateA = new Date(a.entryDateTime || a.date);
        let dateB = new Date(b.entryDateTime || b.date);
        return dateB - dateA;
    });
    
    sortedData.forEach((entry, index) => {
        let row = document.createElement("tr");
        
        let entryDateTime = entry.entryDateTime || 
            new Date(entry.date + " " + new Date().toTimeString().split(' ')[0]).toISOString();
        
        let formattedEntryDate = new Date(entryDateTime).toLocaleString();
        
        // Find the actual index in the original data array
        let originalIndex = data.findIndex(d => 
            d.date === entry.date && 
            d.type === entry.type && 
            d.sub === entry.sub && 
            d.amount === entry.amount &&
            d.entryDateTime === entry.entryDateTime
        );
        
        row.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.type}</td>
            <td>${entry.sub}</td>
            <td>${entry.action || "-"}</td>
            <td>${entry.amount}</td>
            <td>${entry.note || "-"}</td>
            <td>${formattedEntryDate}</td>
            <td>
                <button onclick="deleteEntry(${originalIndex})" 
                        style="background: #ff4d4d; color: white; border: none; 
                               padding: 4px 8px; border-radius: 4px; cursor: pointer;
                               font-size: 12px;">
                    Delete
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // If no entries, show message
    if (sortedData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 20px; color: #ccc;">
                    No entries found. Start adding finance entries to see them here!
                </td>
            </tr>
        `;
    }
}

function deleteEntry(index) {
    if (confirm("Are you sure you want to delete this entry?")) {
        let data = JSON.parse(localStorage.getItem("finance")) || [];
        
        // Remove the entry at the specified index
        data.splice(index, 1);
        
        // Save the updated data
        localStorage.setItem("finance", JSON.stringify(data));
        
        // Refresh all displays
        calculateFinance();
        renderSummaryTable();
        renderExpenseTable();
        renderFinanceLedger();
        drawFinanceChart();
        drawExpensesChart();
        drawSIPChart();
        
        // Refresh the entries log
        renderEntriesLog();
    }
}

function resetData() {
    if (confirm("Are you sure you want to delete all data?")) {
        localStorage.clear();
        location.reload();
    }
}

// ─── CSV DOWNLOAD FUNCTION ───────────────────────────────────────────

function downloadTableCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) {
        console.error('Table not found:', tableId);
        return;
    }
    
    // Get all rows from tbody
    const tbody = table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    
    if (rows.length === 0) {
        console.log('No data to export');
        return;
    }
    
    // Get headers from thead
    const thead = table.querySelector('thead');
    const headerRow = thead.querySelector('tr');
    const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
    
    // Build CSV content
    let csvContent = headers.join(',') + '\n';
    
    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(td => {
            // Escape commas and quotes in cell content
            let cellContent = td.textContent.trim();
            if (cellContent.includes(',') || cellContent.includes('"')) {
                cellContent = '"' + cellContent.replace(/"/g, '""') + '"';
            }
            return cellContent;
        });
        csvContent += cells.join(',') + '\n';
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename + '.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ─── AVATAR QUOTES ────────────────────────────────────────────────────────────

function showAvatarMessage(type) {
    let avatar = document.getElementById("centerAvatar");
    let speech = document.getElementById("avatarSpeech");

    avatar.classList.remove("hidden");

    let quotes = {
        tasks: [
            "Discipline builds your future 💪",
            "Small steps daily = big success 🚀",
            "Consistency beats motivation 🔥"
        ],
        finance: [
            "Save first, spend later 💰",
            "Money grows with discipline 📈",
            "Control money or it controls you ⚡"
        ]
    };

    let randomQuote = quotes[type][Math.floor(Math.random() * quotes[type].length)];
    speech.innerText = randomQuote;

    // Don't hide avatar on home screen - only hide if not on home screen
    const homeScreen = document.getElementById("homeScreen");
    if (homeScreen.classList.contains("hidden")) {
        setTimeout(() => {
            avatar.classList.add("hidden");
        }, 2000);
    }
}

// ─── FINANCE TRACKER - FIX: Button functionality ──────────────────────────────

function openFinancePopup() {
    document.getElementById("financePopup").classList.add("active");
    document.getElementById("financeOverlay").classList.add("active");

    // Set default date to today
    document.getElementById("fDate").valueAsDate = new Date();
    
    document.getElementById("fMainType").value = "";
    document.getElementById("fSubType").innerHTML = "<option>Select Category</option>";
    document.getElementById("fAmount").value = "";
}

function closeFinancePopup() {
    document.getElementById("financePopup").classList.remove("active");
    document.getElementById("financeOverlay").classList.remove("active");
    
    // Clear note field
    document.getElementById("fNote").value = "";
}

function saveFinance() {
    let date = document.getElementById("fDate").value;
    let type = document.getElementById("fMainType").value;
    let sub = document.getElementById("fSubType").value;
    let amount = Number(document.getElementById("fAmount").value);
    let note = document.getElementById("fNote").value;  // Get note field

    // FIX: correct action source
    let actionElement = document.getElementById("fBuySell");
    let action = actionElement ? actionElement.value : "";

    // VALIDATION
    if (!date || !type || !sub || !amount) {
        alert("Please fill all fields");
        return;
    }

    if (type === "savings" && !action) {
        alert("Select Buy or Sell");
        return;
    }

    let entry = {
        date: date,
        type: type,        // already lowercase from HTML 
        sub: sub,
        action: action,    // buy / sell
        amount: amount,
        note: note || "",  // Include note field (optional)
        entryDateTime: new Date().toISOString()  // Record when entry was made
    };

    // Check if Firebase is properly initialized and user is logged in
    if (typeof firebase !== 'undefined' && firebase.auth && currentUser) {
        // Save to Firebase
        firebaseGet(getCurrentUserPath('finance'))
            .then(data => {
                let financeData = data || [];
                financeData.unshift(entry);
                return firebaseSet(getCurrentUserPath('finance'), financeData);
            })
            .then(() => {
                console.log("Finance data saved to Firebase:", entry);
                
                // Update all finance UI elements AFTER Firebase save completes
                calculateFinance();
                renderSummaryTable();
                renderExpenseTable();
                renderFinanceLedger();
                drawFinanceChart();
                drawExpensesChart();
                drawSIPChart();
                renderEntriesLog();
            })
            .catch(error => {
                console.error('Error saving finance data to Firebase:', error);
                // Fallback to localStorage
                let data = JSON.parse(localStorage.getItem("finance")) || [];
                data.unshift(entry);
                localStorage.setItem("finance", JSON.stringify(data));
                
                // Update UI even if Firebase failed
                calculateFinance();
                renderSummaryTable();
                renderExpenseTable();
                renderFinanceLedger();
                drawFinanceChart();
                drawExpensesChart();
                drawSIPChart();
                renderEntriesLog();
            });
    } else {
        // Fallback to localStorage if no current user or Firebase not ready
        let data = JSON.parse(localStorage.getItem("finance")) || [];
        data.unshift(entry);
        localStorage.setItem("finance", JSON.stringify(data));
        
        // Update all finance UI elements
        calculateFinance();
        renderSummaryTable();
        renderExpenseTable();
        renderFinanceLedger();
        drawFinanceChart();
        drawExpensesChart();
        drawSIPChart();
        renderEntriesLog();
    }

    console.log("Saved:", entry);

    closeFinancePopup();
}

function renderDetailedTable() {
    let data = JSON.parse(localStorage.getItem("finance")) || [];
    let table = document.getElementById("detailedTable");
    
    if (!table) {
        console.error('Detailed table element not found');
        return;
    }

    table.innerHTML = `
    <tr>
        <th>Date</th><th>Income</th><th>Other</th><th>Redeem</th><th>Profit</th>
        <th>Home</th><th>Mobile</th><th>Travel</th><th>Health</th>
        <th>Education</th><th>Food</th><th>Entertainment</th><th>Others</th>
        <th>Asset</th><th>Shares</th><th>SIP</th><th>Balance</th>
    </tr>`;

    let balance = 0;

    data.forEach(d => {
        let row = {
            income: 0, other: 0, redeem: 0, profit: 0,
            Home:0, Mobile:0, Travel:0, Health:0,
            Education:0, Food:0, Entertainment:0, Others:0,
            asset:0, shares:0, sip:0
        };

        let amt = Number(d.amount);

        if (d.type === "income") {
            if (d.sub === "Salary") row.income = amt;
            else row.other = amt;
            balance += amt;
        }

        if (d.type === "expense") {
            row[d.sub] = amt;
            balance -= amt;
        }

        if (d.type === "savings") {
            if (d.sub === "Shares" || d.sub === "SIP") {
                if (d.action === "sell") {
                    row.redeem = amt;
                    row.profit = amt;
                    balance += amt;
                } else {
                    balance -= amt;
                }
            }

            if (d.sub === "Asset Savings") {
                row.asset = amt;
                balance -= amt;
            }
        }

        table.innerHTML += `
        <tr>
            <td>${d.date}</td>
            <td>${row.income}</td>
            <td>${row.other}</td>
            <td>${row.redeem}</td>
            <td>${row.profit}</td>
            <td>${formatValue(row.Home)}</td>
            <td>${row.Mobile}</td>
            <td>${row.Travel}</td>
            <td>${row.Health}</td>
            <td>${row.Education}</td>
            <td>${row.Food}</td>
            <td>${row.Entertainment}</td>
            <td>${row.Others}</td>
            <td>${row.asset}</td>
            <td>${row.shares}</td>
            <td>${row.sip}</td>
            <td>${balance}</td>
        </tr>`;
    });
}

function calculateFinance() {
    let data = [];
    
    // Check if Firebase is properly initialized
    if (typeof firebase !== 'undefined' && firebase.auth && currentUser) {
        // Try to get data from Firebase first
        firebaseGet(getCurrentUserPath('finance'))
            .then(financeData => {
                data = financeData || [];
                updateFinanceUI(data);
            })
            .catch(error => {
                console.error('Error getting finance data from Firebase:', error);
                // Fallback to localStorage
                data = JSON.parse(localStorage.getItem("finance")) || [];
                updateFinanceUI(data);
            });
    } else {
        // Fallback to localStorage if no current user or Firebase not ready
        data = JSON.parse(localStorage.getItem("finance")) || [];
        updateFinanceUI(data);
    }
}

function updateFinanceUI(data) {

    let income = 0, expense = 0;
    let shares = 0, sip = 0, asset = 0;
    let profit = 0;

    data.forEach(d => {

        // ✅ INCOME
        if (d.type === "income") {
            income += d.amount;
        }

        // ✅ EXPENSE
        if (d.type === "expense") {
            expense += d.amount;
        }

        // ✅ SAVINGS
        if (d.type === "savings") {

            if (d.sub === "Shares") {
            if (d.action === "buy") shares += d.amount;
            if (d.action === "sell") shares -= d.amount;
            }

            if (d.sub === "SIP") {
                if (d.action === "buy") sip += d.amount;
                if (d.action === "sell") sip -= d.amount;
            }

            if (d.sub === "Asset Savings") {
                asset += d.amount;
            }

            if (d.action === "sell") {
                profit += d.amount;
            }
        }
    });

    let totalSavings = shares + sip + asset;
    let balance = income - expense - totalSavings;

    // 🔥 UPDATE UI
    document.getElementById("incomeVal").innerText = income;
    document.getElementById("expenseVal").innerText = expense;
    document.getElementById("balanceVal").innerText = balance;

    document.getElementById("sharesVal").innerText = shares;
    document.getElementById("sipVal").innerText = sip;
    document.getElementById("assetVal").innerText = asset;
    document.getElementById("profitVal").innerText = profit;
}

// FIX: Pie chart with transparent background and matching colors
function drawFinanceChart() {
    if (currentUser) {
        // Get data from Firebase first
        firebaseGet(getCurrentUserPath('finance'))
            .then(financeData => {
                let data = financeData || [];
                renderFinanceChart(data);
            })
            .catch(error => {
                console.error('Error getting finance data from Firebase:', error);
                // Fallback to localStorage
                let data = JSON.parse(localStorage.getItem("finance")) || [];
                renderFinanceChart(data);
            });
    } else {
        // Fallback to localStorage if no current user
        let data = JSON.parse(localStorage.getItem("finance")) || [];
        renderFinanceChart(data);
    }
}

function renderFinanceChart(data) {
    let wants = 0, needs = 0, savings = 0;

    data.forEach(d => {
        if (["Food","Entertainment","Others"].includes(d.sub))
            wants += d.amount;

        if (["Home","Mobile","Travel","Health","Education"].includes(d.sub))
            needs += d.amount;

        if (["Shares","SIP","Asset Savings"].includes(d.sub))
            savings += d.amount;
    });

    if (financeChartInstance) financeChartInstance.destroy();

    const canvas = document.getElementById("financeChart");

if (!canvas) return;

const ctx = canvas.getContext("2d");

financeChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Wants","Needs","Savings"],
            datasets: [{
                data: [wants, needs, savings],
                backgroundColor: [
                    "#ff6b6b",
                    "#4dabf7",
                    "#51cf66"
                ],
                borderWidth: 0,
                hoverOffset: 20
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        color: "white",
                        font: { size: 14 }
                    }
                }
            }
        }
    });
}

function drawExpensesChart() {
    if (currentUser) {
        // Get data from Firebase first
        firebaseGet(getCurrentUserPath('finance'))
            .then(financeData => {
                let data = financeData || [];
                renderExpensesChart(data);
            })
            .catch(error => {
                console.error('Error getting finance data from Firebase:', error);
                // Fallback to localStorage
                let data = JSON.parse(localStorage.getItem("finance")) || [];
                renderExpensesChart(data);
            });
    } else {
        // Fallback to localStorage if no current user
        let data = JSON.parse(localStorage.getItem("finance")) || [];
        renderExpensesChart(data);
    }
}

function renderExpensesChart(data) {
    let monthlyExpenses = {};
    
    data.forEach(d => {
        if (d.type === "expense") {
            let month = new Date(d.date).toLocaleString("default", {
                month: "short",
                year: "numeric"
            });
            
            if (!monthlyExpenses[month]) {
                monthlyExpenses[month] = 0;
            }
            monthlyExpenses[month] += d.amount;
        }
    });
    
    // Sort months chronologically
    let sortedMonths = Object.keys(monthlyExpenses).sort((a, b) => {
        let dateA = new Date(a);
        let dateB = new Date(b);
        return dateA - dateB;
    });
    
    if (expensesChartInstance) expensesChartInstance.destroy();
    
    const canvas = document.getElementById("expensesChart");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    
    expensesChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: sortedMonths,
            datasets: [{
                label: "Monthly Expenses",
                data: sortedMonths.map(month => monthlyExpenses[month]),
                backgroundColor: "#ff6b6b",
                borderColor: "#ff5252",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: "white",
                        font: { size: 14 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "white"
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.1)"
                    }
                },
                x: {
                    ticks: {
                        color: "white"
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.1)"
                    }
                }
            }
        }
    });
}

function drawSIPChart() {
    if (currentUser) {
        // Get data from Firebase first
        firebaseGet(getCurrentUserPath('finance'))
            .then(financeData => {
                let data = financeData || [];
                renderSIPChart(data);
            })
            .catch(error => {
                console.error('Error getting finance data from Firebase:', error);
                // Fallback to localStorage
                let data = JSON.parse(localStorage.getItem("finance")) || [];
                renderSIPChart(data);
            });
    } else {
        // Fallback to localStorage if no current user
        let data = JSON.parse(localStorage.getItem("finance")) || [];
        renderSIPChart(data);
    }
}

function renderSIPChart(data) {
    let monthlySIP = {};
    
    data.forEach(d => {
        if (d.type === "savings" && d.sub === "SIP" && d.action === "buy") {
            let month = new Date(d.date).toLocaleString("default", {
                month: "short",
                year: "numeric"
            });
            
            if (!monthlySIP[month]) {
                monthlySIP[month] = 0;
            }
            monthlySIP[month] += d.amount;
        }
    });
    
    // Sort months chronologically
    let sortedMonths = Object.keys(monthlySIP).sort((a, b) => {
        let dateA = new Date(a);
        let dateB = new Date(b);
        return dateA - dateB;
    });
    
    if (sipChartInstance) sipChartInstance.destroy();
    
    const canvas = document.getElementById("sipChart");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    
    sipChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: sortedMonths,
            datasets: [{
                label: "Monthly SIP",
                data: sortedMonths.map(month => monthlySIP[month]),
                backgroundColor: "#51cf66",
                borderColor: "#40c057",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: "white",
                        font: { size: 14 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "white"
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.1)"
                    }
                },
                x: {
                    ticks: {
                        color: "white"
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.1)"
                    }
                }
            }
        }
    });
}

function updateSubType() {
    let main = document.getElementById("fMainType").value;
    let sub = document.getElementById("fSubType");
    let buySell = document.getElementById("buySellBox");

    sub.innerHTML = "";
    buySell.innerHTML = "";

    let options = [];

    if (main === "income") {
        options = ["Salary", "Other Income"];
    }

    else if (main === "expense") {
        options = [
            "Home", "Mobile", "Travel",
            "Health", "Education", "Food",
            "Entertainment", "Others"
        ];
    }

    else if (main === "savings") {
        options = ["Asset Savings", "Shares", "SIP"];

        // Add Buy/Sell option
        buySell.innerHTML = `
            <select id="fBuySell">
                <option value="">Select Action</option>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
            </select>
        `;
    }

    options.forEach(opt => {
        let option = document.createElement("option");
        option.value = opt;
        option.text = opt;
        sub.appendChild(option);
    });
}

function renderSummaryTable() {
    if (currentUser) {
        // Get data from Firebase first
        firebaseGet(getCurrentUserPath('finance'))
            .then(financeData => {
                let data = financeData || [];
                renderSummaryTableData(data);
            })
            .catch(error => {
                console.error('Error getting finance data from Firebase:', error);
                // Fallback to localStorage
                let data = JSON.parse(localStorage.getItem("finance")) || [];
                renderSummaryTableData(data);
            });
    } else {
        // Fallback to localStorage if no current user
        let data = JSON.parse(localStorage.getItem("finance")) || [];
        renderSummaryTableData(data);
    }
}

function renderSummaryTableData(data) {
    let table = document.getElementById("summaryTable");
    let tbody = table.querySelector("tbody");
    
    if (!table || !tbody) return;

    tbody.innerHTML = "";

    let monthly = {};
    
    data.forEach(d => {
        let month = new Date(d.date).toLocaleString("default", {
            month: "short",
            year: "numeric"
        });

        if (!monthly[month]) {
            monthly[month] = {
                income: 0, expense: 0,
                shares: 0, sip: 0, asset: 0,
                profit: 0
            };
        }

        if (d.type === "income") monthly[month].income += d.amount;
        if (d.type === "expense") monthly[month].expense += d.amount;

        if (d.type === "savings") {
            if (d.sub === "Shares") {
                if (d.action === "buy") monthly[month].shares += d.amount;
                if (d.action === "sell") monthly[month].profit += d.amount;
            }

            if (d.sub === "SIP") {
                if (d.action === "buy") monthly[month].sip += d.amount;
                if (d.action === "sell") monthly[month].profit += d.amount;
            }

            if (d.sub === "Asset Savings") {
                monthly[month].asset += d.amount;
            }
        }
    });

    for (let m in monthly) {
        let row = monthly[m];
        let balance = row.income - row.expense;

        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${m}</td>
            <td>${show(row.income)}</td>
            <td>${show(row.expense)}</td>
            <td>${show(row.shares)}</td>
            <td>${show(row.sip)}</td>
            <td>${show(row.asset)}</td>
            <td>${show(row.profit)}</td>
            <td><b>${balance === 0 ? "-" : balance}</b></td>
        `;
        tbody.appendChild(tr);
    }
}

function formatValue(v) {
    if (v === 0 || v === null || v === undefined) return "-";
    return `<span class="blur-cell">${v}</span>`;
}

function show(v) {
    if (!v || v === 0) return "-";
    return `<span class="blur-cell">${v}</span>`;
}

function renderFinanceLedger() {
    if (currentUser) {
        // Get data from Firebase first
        firebaseGet(getCurrentUserPath('finance'))
            .then(financeData => {
                let data = financeData || [];
                renderFinanceLedgerData(data);
            })
            .catch(error => {
                console.error('Error getting finance data from Firebase:', error);
                // Fallback to localStorage
                let data = JSON.parse(localStorage.getItem("finance")) || [];
                renderFinanceLedgerData(data);
            });
    } else {
        // Fallback to localStorage if no current user
        let data = JSON.parse(localStorage.getItem("finance")) || [];
        renderFinanceLedgerData(data);
    }
}

function renderFinanceLedgerData(data) {
    let table = document.getElementById("financeLedger");
    let tbody = table.querySelector("tbody");
    if (!table || !tbody) return; // safety check

    tbody.innerHTML = "";

    // STEP 1: SORT DATA FIRST
    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    let grouped = {};
    let balance = 0;

    // STEP 2: GROUP + CALCULATE
    data.forEach(d => {
        if (!grouped[d.date]) {
            grouped[d.date] = {
                income: 0,
                otherIncome: 0,
                redeem: 0,
                profit: 0,
                Home: 0,
                Mobile: 0,
                Travel: 0,
                Health: 0,
                Education: 0,
                Food: 0,
                Entertainment: 0,
                Others: 0,
                asset: 0,
                shares: 0,
                sip: 0,
                balance: 0
            };
        }

        let row = grouped[d.date];
        let amt = Number(d.amount);

        if (d.type === "income") {
            if (d.sub === "Salary") row.income += amt;
            else row.otherIncome += amt;
            balance += amt;
        }

        if (d.type === "expense") {
            if (row[d.sub] !== undefined) {
                row[d.sub] += amt;
            }
            balance -= amt;
        }

        if (d.type === "savings") {
            if (d.sub === "Shares" || d.sub === "SIP") {
                if (d.action === "sell") {
                    row.redeem += amt;
                    row.profit += amt;
                    balance += amt;
                } else {
                    if (d.sub === "Shares") row.shares += amt;
                    if (d.sub === "SIP") row.sip += amt;
                    balance -= amt;
                }
            }

            if (d.sub === "Asset Savings") {
                row.asset += amt;
                balance -= amt;
            }
        }

        row.balance = balance; // ✅ correct cumulative (after sorting)
    });

    // STEP 3: SORT DATES
    let sortedDates = Object.keys(grouped).sort(
        (a, b) => new Date(a) - new Date(b)
    );

    // STEP 4: RENDER
    sortedDates.forEach(date => {
        let r = grouped[date];

        function show(v) {
            if (!v) return "-";
            let color = v > 0 ? "#00ffaa" : "#ff4d4d";
            return `<span class="blur-cell" style="color:${color}">${v}</span>`;
        }

        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${date}</td>
            <td>${show(r.income)}</td>
            <td>${show(r.otherIncome)}</td>
            <td>${show(r.redeem)}</td>
            <td>${show(r.profit)}</td>
            <td>${show(r.Home)}</td>
            <td>${show(r.Mobile)}</td>
            <td>${show(r.Travel)}</td>
            <td>${show(r.Health)}</td>
            <td>${show(r.Education)}</td>
            <td>${show(r.Food)}</td>
            <td>${show(r.Entertainment)}</td>
            <td>${show(r.Others)}</td>
            <td>${show(r.asset)}</td>
            <td>${show(r.shares)}</td>
            <td>${show(r.sip)}</td>
            <td><b>${r.balance}</b></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderExpenseTable() {
    if (currentUser) {
        // Get data from Firebase first
        firebaseGet(getCurrentUserPath('finance'))
            .then(financeData => {
                let data = financeData || [];
                renderExpenseTableData(data);
            })
            .catch(error => {
                console.error('Error getting finance data from Firebase:', error);
                // Fallback to localStorage
                let data = JSON.parse(localStorage.getItem("finance")) || [];
                renderExpenseTableData(data);
            });
    } else {
        // Fallback to localStorage if no current user
        let data = JSON.parse(localStorage.getItem("finance")) || [];
        renderExpenseTableData(data);
    }
}

function renderExpenseTableData(data) {
    let table = document.getElementById("expenseTable");
    let tbody = table.querySelector("tbody");
    if (!table || !tbody) return; // STOP if element not found

    tbody.innerHTML = "";

    let monthly = {};

    data.forEach(d => {

        // FIX: correct type check
        if (d.type !== "expense") return;

        let month = new Date(d.date).toLocaleString("default", {
            month: "short",
            year: "numeric"
        });

        if (!monthly[month]) {
            monthly[month] = {
                Home: 0, Mobile: 0, Travel: 0, Health: 0,
                Education: 0, Food: 0, Entertainment: 0, Others: 0
            };
        }

        // ✅ SAFE ADD
        if (monthly[month][d.sub] !== undefined) {
            monthly[month][d.sub] += Number(d.amount);
        }
    });

    // 🔥 SORT MONTHS (latest first)
    let sortedMonths = Object.keys(monthly).sort((a, b) => new Date(a) - new Date(b));

    function show(v) {
        if (v === 0 || v === null || v === undefined || v === "") {
            return "-";
        }
        return `<span class="blur-cell">${v}</span>`;
    }

    sortedMonths.forEach(m => {
        let row = monthly[m];

        let total =
            row.Home + row.Mobile + row.Travel +
            row.Health + row.Education + row.Food +
            row.Entertainment + row.Others;

        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${m}</td>
            <td>${show(row.Home)}</td>
            <td>${show(row.Mobile)}</td>
            <td>${show(row.Travel)}</td>
            <td>${show(row.Health)}</td>
            <td>${show(row.Education)}</td>
            <td>${show(row.Food)}</td>
            <td>${show(row.Entertainment)}</td>
            <td>${show(row.Others)}</td>
            <td><b>${total}</b></td>
        `;
        tbody.appendChild(tr);
    });
}

// ─── WELCOME POPUP ────────────────────────────────────────────────────────────

function showWelcome() {
    document.getElementById("welcomePopup").classList.remove("hidden");
    document.getElementById("overlay").classList.remove("hidden");
    document.body.classList.add("modal-open");
    
    // Also show user input popup on top of welcome
    setTimeout(() => {
        document.getElementById("userPopup").classList.remove("hidden");
    }, 500);
}

function closeWelcome() {
    document.getElementById("welcomePopup").classList.add("hidden");
    document.getElementById("overlay").classList.add("hidden");
    document.body.classList.remove("modal-open");
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

window.onload = function () {
    checkUser();

    calculateFinance();
    renderSummaryTable();
    renderExpenseTable();
    renderFinanceLedger();
    
    // Add delay to ensure DOM is ready for charts
    setTimeout(() => {
        drawFinanceChart();
        drawExpensesChart();
        drawSIPChart();
        drawGraph(); // Add missing task tracker chart initialization
    }, 100);

    renderCalendar();
    
    // Always show avatar on home screen
    initializeAvatar();
    
    // Add multiple attempts to ensure button gets updated
    setTimeout(() => {
        updateDailyTasksButton();
    }, 200);
    
    setTimeout(() => {
        updateDailyTasksButton();
    }, 500);
    
    setTimeout(() => {
        updateDailyTasksButton();
    }, 1000);
    
    // Initialize new task tracker systems
    updateTotalCoins();
    updateGlobalTracking(); // Initialize cumulative coins
    updateExperienceBar();
    
    // Add click outside functionality for 3D tab
    document.addEventListener("click", function(event) {
        const tab = document.getElementById('dailyTasksTab');
        if (!tab.classList.contains('hidden')) {
            // Check if click is outside the tab
            const isClickInsideTab = tab.contains(event.target);
            const isClickOnButton = document.getElementById('dailyTasksBtn').contains(event.target);
            
            if (!isClickInsideTab && !isClickOnButton) {
                closeDailyTasksTab();
            }
        }
    });
    
    // Check if first time today and show appropriate avatar message
    if (getFirstTimeToday()) {
        currentMessageIndex = 0; // Start with first message
    }
    document.body.classList.remove("modal-open");
}

// ─── MOBILE MENU FUNCTIONS ────────────────────────────────────────────────────

function toggleMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    
    if (mobileNav.classList.contains('active')) {
        mobileNav.classList.remove('active');
        mobileMenuBtn.innerHTML = '??';
    } else {
        mobileNav.classList.add('active');
        mobileMenuBtn.innerHTML = '??';
    }
}

// Close mobile menu when clicking outside
document.addEventListener("click", function(event) {
    const mobileNav = document.getElementById('mobileNav');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    
    if (mobileNav && mobileNav.classList.contains('active')) {
        const isClickInsideNav = mobileNav.contains(event.target);
        const isClickOnMenuBtn = mobileMenuBtn.contains(event.target);
        
        if (!isClickInsideNav && !isClickOnMenuBtn) {
            toggleMobileMenu();
        }
    }
});

// AUTHENTICATION FUNCTIONS

// Show login popup
function showLogin() {
    hideAllPopups();
    document.getElementById('loginPopup').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    // Auto-focus email field
    setTimeout(() => {
        document.getElementById('loginEmail').focus();
    }, 100);
}

// Show signup popup
function showSignup() {
    hideAllPopups();
    document.getElementById('signupPopup').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    // Auto-focus name field
    setTimeout(() => {
        document.getElementById('signupName').focus();
    }, 100);
}

// Show forgot password popup
function showForgotPassword() {
    hideAllPopups();
    document.getElementById('forgotPasswordPopup').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    // Auto-focus email field
    setTimeout(() => {
        document.getElementById('resetEmail').focus();
    }, 100);
}

// Hide all popups
function hideAllPopups() {
    document.getElementById('loginPopup').classList.add('hidden');
    document.getElementById('signupPopup').classList.add('hidden');
    document.getElementById('forgotPasswordPopup').classList.add('hidden');
    document.getElementById('userPopup').classList.add('hidden');
    document.getElementById('welcomePopup').classList.add('hidden');
}

// Login user
function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Validation
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Show loading state
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Signing in...';
    loginBtn.disabled = true;
    
    // Check if Firebase Auth is properly configured
    if (typeof firebase === 'undefined' || !firebase.auth) {
        alert('Firebase is not properly loaded. Please refresh the page and try again.');
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
        return;
    }
    
    // Firebase authentication
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('User logged in:', user);
            
            // Save user session
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userUid', user.uid);
            localStorage.setItem('userName', user.displayName || email.split('@')[0]);
            
            // Update global user variable
            currentUser = user;
            
            // Show home screen first
            document.getElementById("homeScreen").classList.remove("hidden");
            
            // Load user data
            loadUserData();
            
            // Close login popup
            hideAllPopups();
            document.getElementById('overlay').classList.add('hidden');
            document.body.classList.remove('modal-open');
            
            // Show success message
            showNotification('Welcome back! Your data has been loaded.', 'success');
        })
        .catch((error) => {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please try again.';
            
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Account has been disabled.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/configuration-not-found':
                    errorMessage = 'Firebase Authentication is not configured. Please enable Authentication in Firebase Console:\n\n1. Go to Firebase Console\n2. Select project: wisdomwalker-40e63\n3. Go to Authentication > Sign-in method\n4. Enable Email/Password sign-in\n5. Try again';
                    break;
            }
            
            alert(errorMessage);
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        });
}

// Create new account
function createAccount() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }
    
    if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    if (password.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (!validatePassword(password)) {
        alert('Password must contain at least 8 characters, one uppercase letter, and one number');
        return;
    }
    
    // Show loading state
    const signupBtn = document.querySelector('.signup-btn');
    const originalText = signupBtn.textContent;
    signupBtn.textContent = 'Creating account...';
    signupBtn.disabled = true;
    
    // Firebase authentication
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('User created:', user);
            
            // Update display name
            return user.updateProfile({
                displayName: name
            });
        })
        .then(() => {
            // Save user session
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userUid', user.uid);
            localStorage.setItem('userName', name);
            
            // Update global user variable
            currentUser = user;
            
            // Initialize user data in Firebase
            initializeUserData();
            
            // Close signup popup
            hideAllPopups();
            document.getElementById('overlay').classList.add('hidden');
            document.body.classList.remove('modal-open');
            
            // Show home screen first
            document.getElementById('homeScreen').classList.remove('hidden');
            
            // Load user data
            loadUserData();
            
            // Show success message
            showNotification('Account created successfully! Welcome to Wisdom Walker.', 'success');
        })
        .catch((error) => {
            console.error('Signup error:', error);
            let errorMessage = 'Account creation failed. Please try again.';
            
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Please choose a stronger password.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many requests. Please try again later.';
                    break;
            }
            
            alert(errorMessage);
            signupBtn.textContent = originalText;
            signupBtn.disabled = false;
        });
}

// Send password reset email
function sendPasswordReset() {
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!email) {
        alert('Please enter your email address');
        return;
    }
    
    if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Show loading state
    const resetBtn = document.querySelector('.reset-btn');
    const originalText = resetBtn.textContent;
    resetBtn.textContent = 'Sending...';
    resetBtn.disabled = true;
    
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            alert('Password reset email sent! Please check your inbox.');
            hideAllPopups();
            document.getElementById('overlay').classList.add('hidden');
            document.body.classList.remove('modal-open');
        })
        .catch((error) => {
            console.error('Password reset error:', error);
            let errorMessage = 'Failed to send reset email. Please try again.';
            
            switch(error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many requests. Please try again later.';
                    break;
            }
            
            alert(errorMessage);
            resetBtn.textContent = originalText;
            resetBtn.disabled = false;
        });
}

// Email validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Password validation
function validatePassword(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasMinLength = password.length >= 8;
    
    return hasUppercase && hasNumber && hasMinLength;
}

// Update password requirements UI
function updatePasswordRequirements() {
    const password = document.getElementById('signupPassword').value;
    const lengthReq = document.getElementById('lengthReq');
    const uppercaseReq = document.getElementById('uppercaseReq');
    const numberReq = document.getElementById('numberReq');
    
    // Check each requirement
    if (password.length >= 8) {
        lengthReq.classList.add('valid');
    } else {
        lengthReq.classList.remove('valid');
    }
    
    if (/[A-Z]/.test(password)) {
        uppercaseReq.classList.add('valid');
    } else {
        uppercaseReq.classList.remove('valid');
    }
    
    if (/\d/.test(password)) {
        numberReq.classList.add('valid');
    } else {
        numberReq.classList.remove('valid');
    }
}

// Initialize user data in Firebase
function initializeUserData() {
    const userPath = getCurrentUserPath();
    
    // Initialize user data structure
    const initialData = {
        tasks: {},
        finance: [],
        settings: {
            theme: 'dark',
            notifications: true
        },
        createdAt: new Date().toISOString()
    };
    
    firebaseSet(userPath, initialData)
        .then(() => {
            console.log('User data initialized');
        })
        .catch((error) => {
            console.error('Error initializing user data:', error);
        });
}

// Load user data
function loadUserData() {
    // Load all user-specific data
    renderCalendar();
    drawGraph();
    updateTotalCoins();
    updateExperienceBar();
    loadHistory();
    calculateFinance();
    renderSummaryTable();
    renderExpenseTable();
    renderFinanceLedger();
    drawFinanceChart();
    drawExpensesChart();
    drawSIPChart();
    
    // Update UI with user info
    updateUserInfo();
}

// Update user info display
function updateUserInfo() {
    const userName = localStorage.getItem('userName') || 'User';
    const userEmail = localStorage.getItem('userEmail') || '';
    
    // Update displays
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = userName.toUpperCase();
    }
    
    // Update greeting
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.textContent = `Hello, ${userName}!`;
    }
}

// Settings functions
function openSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    settingsPanel.classList.remove('hidden');
    
    // Update user info in settings
    updateSettingsUserInfo();
}

function closeSettings() {
    document.getElementById('settingsPanel').classList.add('hidden');
}

function updateSettingsUserInfo() {
    const userName = localStorage.getItem('userName') || 'User';
    const userEmail = localStorage.getItem('userEmail') || 'Not available';
    
    const userNameElement = document.getElementById('settingsUserName');
    const userEmailElement = document.getElementById('settingsUserEmail');
    
    if (userNameElement) {
        userNameElement.textContent = `User Name: ${userName}`;
    }
    
    if (userEmailElement) {
        userEmailElement.textContent = `Email: ${userEmail}`;
    }
}

// Change name dialog functions
function showChangeNameDialog() {
    const dialog = document.getElementById('changeNameDialog');
    const input = document.getElementById('newUserName');
    
    // Set current name as placeholder
    const currentName = localStorage.getItem('userName') || '';
    input.value = currentName;
    input.placeholder = 'Enter your new name';
    
    // Show dialog
    dialog.classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    // Focus input
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
}

function closeChangeNameDialog() {
    document.getElementById('changeNameDialog').classList.add('hidden');
    document.getElementById('overlay').classList.add('hidden');
    document.body.classList.remove('modal-open');
    closeSettings();
}

function saveUserName() {
    const newName = document.getElementById('newUserName').value.trim();
    
    if (!newName) {
        alert('Please enter a name');
        return;
    }
    
    if (newName.length < 2) {
        alert('Name must be at least 2 characters long');
        return;
    }
    
    if (newName.length > 50) {
        alert('Name must be less than 50 characters');
        return;
    }
    
    // Update localStorage
    localStorage.setItem('userName', newName);
    
    // Update Firebase if available
    if (currentUser && typeof firebase !== 'undefined' && firebase.auth) {
        currentUser.updateProfile({
            displayName: newName
        }).then(() => {
            console.log('Firebase profile name updated');
        }).catch((error) => {
            console.error('Error updating Firebase profile name:', error);
        });
    }
    
    // Update all UI elements
    updateUserInfo();
    updateSettingsUserInfo();
    
    // Close dialog
    closeChangeNameDialog();
    
    // Show success notification
    showNotification('Name updated successfully!', 'success');
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#00ffaa' : '#ff6b6b'};
        color: ${type === 'success' ? 'black' : 'white'};
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Add event listeners for password requirements
document.addEventListener('DOMContentLoaded', function() {
    const signupPassword = document.getElementById('signupPassword');
    if (signupPassword) {
        signupPassword.addEventListener('input', updatePasswordRequirements);
    }
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// CSV Download Functionality
function downloadTableCSV(tableId, filename) {
    try {
        const table = document.getElementById(tableId);
        if (!table) {
            console.error('Table not found:', tableId);
            alert('Table not found. Please try again.');
            return;
        }

        let csv = [];
        
        // Get table headers
        const headers = table.querySelectorAll('thead th');
        const headerRow = [];
        headers.forEach(header => {
            headerRow.push(header.textContent.trim());
        });
        csv.push(headerRow.join(','));

        // Get table rows
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const rowData = [];
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
                // Clean cell data and handle commas
                let cellData = cell.textContent.trim();
                if (cellData.includes(',')) {
                    cellData = `"${cellData}"`;
                }
                rowData.push(cellData);
            });
            csv.push(rowData.join(','));
        });

        // Create CSV blob
        const csvContent = csv.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        // Generate filename with date
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const fullFilename = `${filename}_${dateStr}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fullFilename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        showNotification(`${filename} downloaded successfully!`, 'success');
        
    } catch (error) {
        console.error('Error downloading CSV:', error);
        alert('Error downloading CSV. Please try again.');
    }
}