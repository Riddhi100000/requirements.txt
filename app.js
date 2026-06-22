/* ==========================================
   SafeGuard AI - Women's Safety
   Frontend JavaScript
   ========================================== */

// ==========================================
// GLOBAL VARIABLES
// ==========================================

let currentLat = 0;
let currentLng = 0;
let currentAddress = "Getting location...";
let sosTimer = null;
let sosTimeout = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let recordInterval = null;
let recordSeconds = 0;
let voiceRecognition = null;
let isVoiceActive = false;


// ==========================================
// INITIALIZE ON PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", function() {
    // Get user's current location when page loads
    getLocation();
});


// ==========================================
// 1. LOCATION TRACKING
// ==========================================

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                currentLat = position.coords.latitude;
                currentLng = position.coords.longitude;

                // Update the display
                document.getElementById("lat").textContent = currentLat.toFixed(6);
                document.getElementById("lng").textContent = currentLng.toFixed(6);

                // Get human-readable address
                getAddress(currentLat, currentLng);

                // Update map placeholder
                document.getElementById("mapPlaceholder").innerHTML = 
                    '<iframe src="https://maps.google.com/maps?q=' + 
                    currentLat + ',' + currentLng + 
                    '&z=15&output=embed" width="100%" height="100%" frameborder="0" style="border-radius:12px;"></iframe>';
            },
            function(error) {
                document.getElementById("address").textContent = 
                    "Location access denied. Please enable GPS.";
                console.error("Location error:", error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        document.getElementById("address").textContent = "Geolocation not supported by browser.";
    }
}

function getAddress(lat, lng) {
    // Use free OpenStreetMap API to get address
    fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lng)
        .then(response => response.json())
        .then(data => {
            currentAddress = data.display_name || "Address not found";
            document.getElementById("address").textContent = currentAddress;
        })
        .catch(() => {
            currentAddress = "Address lookup failed";
            document.getElementById("address").textContent = currentAddress;
        });
}

function refreshLocation() {
    document.getElementById("address").textContent = "Refreshing...";
    getLocation();
}


// ==========================================
// 2. SOS ALERT SYSTEM
// ==========================================

function startSOS() {
    /*
    SOS works on "press and hold" for 3 seconds.
    This prevents accidental triggers.
    */
    document.getElementById("sosStatus").textContent = "Hold for 3 seconds...";
    
    let progress = 0;
    const progressBar = document.getElementById("sosProgress");
    
    // Animate progress bar over 3 seconds
    sosTimer = setInterval(function() {
        progress += 1;
        progressBar.style.width = progress + "%";
    }, 30); // 30ms * 100 = 3 seconds

    // Trigger SOS after 3 seconds of holding
    sosTimeout = setTimeout(function() {
        triggerSOS();
    }, 3000);
}

function cancelSOS() {
    /* User released the button before 3 seconds */
    if (sosTimer) {
        clearInterval(sosTimer);
        sosTimer = null;
    }
    if (sosTimeout) {
        clearTimeout(sosTimeout);
        sosTimeout = null;
    }
    
    document.getElementById("sosProgress").style.width = "0%";
    document.getElementById("sosStatus").textContent = "";
}

function triggerSOS() {
    /*
    This is the CORE function!
    When triggered, it:
    1. Gets current location
    2. Sends alert to backend
    3. Starts audio recording
    4. Shows notification
    */
    document.getElementById("sosStatus").textContent = "🚨 SOS ALERT TRIGGERED!";
    document.getElementById("sosStatus").style.color = "#ef4444";

    // Send SOS to backend with location
    fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            latitude: currentLat,
            longitude: currentLng,
            address: currentAddress
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            let msg = "🚨 SOS ACTIVE! ";
            
            if (data.contacts_notified.length > 0) {
                msg += "Notified: ";
                data.contacts_notified.forEach(function(c) {
                    msg += c.name + " (" + c.phone + "), ";
                });
            } else {
                msg += "No contacts added. Add emergency contacts!";
            }
            
            document.getElementById("sosStatus").textContent = msg;

            // Auto-start audio recording as evidence
            startRecording();

            // Show browser notification
            if (Notification.permission === "granted") {
                new Notification("SafeGuard AI - SOS Active", {
                    body: "Emergency alert sent! Recording evidence...",
                    icon: "🚨"
                });
            }
        }
    })
    .catch(error => {
        console.error("SOS Error:", error);
        document.getElementById("sosStatus").textContent = "Error sending SOS. Try again.";
    });
}


// ==========================================
// 3. VOICE-ACTIVATED SOS
// ==========================================

function toggleVoiceDetection() {
    if (isVoiceActive) {
        stopVoiceDetection();
    } else {
        startVoiceDetection();
    }
}

function startVoiceDetection() {
    /*
    Uses the browser's built-in Speech Recognition API.
    Continuously listens for the word "HELP".
    */
    
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        alert("Voice detection not supported in this browser. Try Chrome.");
        return;
    }

    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = true;    // Keep listening
    voiceRecognition.interimResults = true; // Get results as user speaks
    voiceRecognition.lang = "en-US";

    voiceRecognition.onresult = function(event) {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        
        transcript = transcript.toLowerCase();
        console.log("Heard:", transcript);

        // Check if user said "help" or "bachao" (Hindi for help)
        if (transcript.includes("help") || transcript.includes("bachao") || transcript.includes("save me")) {
            document.getElementById("voiceText").textContent = 
                "🚨 'HELP' detected! Triggering SOS!";
            triggerSOS();
            stopVoiceDetection();
        }
    };

    voiceRecognition.onerror = function(event) {
        console.error("Voice error:", event.error);
        if (event.error !== "no-speech") {
            stopVoiceDetection();
        }
    };

    voiceRecognition.onend = function() {
        // Restart if still active (it sometimes stops automatically)
        if (isVoiceActive) {
            voiceRecognition.start();
        }
    };

    voiceRecognition.start();
    isVoiceActive = true;
    
    document.getElementById("voiceBtn").textContent = "Stop Listening";
    document.getElementById("voiceBtn").classList.add("btn-red");
    document.getElementById("voiceDot").className = "dot dot-active";
    document.getElementById("voiceText").textContent = "Listening for 'HELP'...";
}

function stopVoiceDetection() {
    if (voiceRecognition) {
        isVoiceActive = false;
        voiceRecognition.stop();
    }
    
    document.getElementById("voiceBtn").textContent = "Start Listening";
    document.getElementById("voiceBtn").classList.remove("btn-red");
    document.getElementById("voiceDot").className = "dot dot-inactive";
    document.getElementById("voiceText").textContent = "Voice detection off";
}


// ==========================================
// 4. SAFETY CHECK-IN
// ==========================================

function doCheckin() {
    const message = document.getElementById("checkinMessage").value || "I am safe";
    
    fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            latitude: currentLat,
            longitude: currentLng,
            message: message
        })
    })
    .then(response => response.json())
    .then(data => {
        const resultBox = document.getElementById("checkinResult");
        resultBox.classList.remove("hidden");
        resultBox.textContent = "✅ " + data.message;
        document.getElementById("checkinMessage").value = "";
    })
    .catch(error => {
        console.error("Check-in error:", error);
    });
}


// ==========================================
// 5. AUDIO EVIDENCE RECORDING
// ==========================================

function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    /*
    Uses the browser's MediaRecorder API to capture microphone audio.
    Audio is saved as WebM format.
    */
    if (isRecording) return;

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = function(event) {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = function() {
                // Create audio file from recorded chunks
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Show playback
                const playback = document.getElementById("audioPlayback");
                playback.src = audioUrl;
                playback.classList.remove("hidden");

                // Show upload button
                document.getElementById("uploadBtn").classList.remove("hidden");

                // Store the blob for uploading
                window.recordedAudio = audioBlob;

                // Stop all tracks (release microphone)
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;

            // Update UI
            document.getElementById("recordBtn").textContent = "⏹️ Stop Recording";
            document.getElementById("recordBtn").classList.remove("btn-red");
            document.getElementById("recordBtn").classList.add("btn-secondary");

            // Start timer
            recordSeconds = 0;
            recordInterval = setInterval(function() {
                recordSeconds++;
                const mins = String(Math.floor(recordSeconds / 60)).padStart(2, "0");
                const secs = String(recordSeconds % 60).padStart(2, "0");
                document.getElementById("recordTimer").textContent = mins + ":" + secs;
            }, 1000);
        })
        .catch(function(error) {
            console.error("Microphone error:", error);
            alert("Please allow microphone access to record evidence.");
        });
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;

        // Stop timer
        clearInterval(recordInterval);

        // Update UI
        document.getElementById("recordBtn").textContent = "⏺️ Start Recording";
        document.getElementById("recordBtn").classList.add("btn-red");
        document.getElementById("recordBtn").classList.remove("btn-secondary");
    }
}

function uploadAudio() {
    /* Upload the recorded audio to the server */
    if (!window.recordedAudio) {
        alert("No audio recorded!");
        return;
    }

    const formData = new FormData();
    formData.append("audio", window.recordedAudio, "evidence.webm");

    document.getElementById("uploadBtn").textContent = "Uploading...";

    fetch("/api/upload-audio", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        const resultBox = document.getElementById("uploadResult");
        resultBox.classList.remove("hidden");
        
        if (data.success) {
            resultBox.textContent = "✅ " + data.message;
            document.getElementById("uploadBtn").textContent = "✅ Evidence Saved!";
            document.getElementById("uploadBtn").disabled = true;
        } else {
            resultBox.textContent = "❌ " + data.error;
        }
    })
    .catch(error => {
        console.error("Upload error:", error);
    });
}


// ==========================================
// 6. EMERGENCY CONTACTS MANAGEMENT
// ==========================================

function addContact() {
    const name = document.getElementById("contactName").value;
    const phone = document.getElementById("contactPhone").value;
    const relation = document.getElementById("contactRelation").value;

    if (!name || !phone) {
        alert("Please fill in name and phone number.");
        return;
    }

    fetch("/api/add-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: name,
            phone: phone,
            relation: relation
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reload the page to show updated contact list
            location.reload();
        }
    })
    .catch(error => {
        console.error("Add contact error:", error);
    });
}

function deleteContact(contactId) {
    if (!confirm("Delete this contact?")) return;

    fetch("/api/delete-contact/" + contactId, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        }
    })
    .catch(error => {
        console.error("Delete contact error:", error);
    });
}


// ==========================================
// 7. REQUEST NOTIFICATION PERMISSION
// ==========================================

if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
}
