"use strict";
console.log("index.ts loaded (Exercise 2)");
function getEl(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Missing element with id="${id}"`);
    return el;
}
function clearElement(el) {
    while (el.firstChild)
        el.removeChild(el.firstChild);
}
function showAlertForStatus(status) {
    if (status === 400)
        alert("Bad request (400). Possibly out of stock or invalid request.");
    else if (status === 404)
        alert("Not found (404). That song does not exist.");
    else if (status === 500)
        alert("Server error (500). Check your server console.");
    else
        alert(`Request failed (HTTP ${status}).`);
}
async function buySong(songId) {
    const resp = await fetch(`/song/${songId}/buy`, { method: "POST" });
    if (!resp.ok) {
        showAlertForStatus(resp.status);
        return;
    }
    // Your server returns JSON (201) with message + maybe song
    const data = await resp.json().catch(() => null);
    alert(data?.message ?? "Purchase successful!");
    // Optional: refresh results after buying so quantity updates
    const artist = getEl("theArtist").value;
    await fetchByArtist(artist);
}
async function fetchByArtist(artist) {
    const resultsDiv = getEl("htresults");
    clearElement(resultsDiv);
    const trimmed = artist.trim();
    if (trimmed === "") {
        resultsDiv.appendChild(document.createTextNode("Please enter an artist."));
        return;
    }
    // Loading message using DOM
    const loadingP = document.createElement("p");
    loadingP.textContent = "Loading...";
    resultsDiv.appendChild(loadingP);
    const resp = await fetch(`/artist/${encodeURIComponent(trimmed)}`);
    if (!resp.ok) {
        clearElement(resultsDiv);
        showAlertForStatus(resp.status);
        return;
    }
    const songs = await resp.json();
    clearElement(resultsDiv);
    if (songs.length === 0) {
        const p = document.createElement("p");
        p.textContent = "No songs found.";
        resultsDiv.appendChild(p);
        return;
    }
    // ✅ Exercise requirement: forEach() + DOM creation
    songs.forEach((song) => {
        // 1) Create a paragraph and set its innerHTML to song details
        const p = document.createElement("p");
        p.innerHTML =
            `<strong>${song.title}</strong> (${song.year})<br>` +
                `Artist: ${song.artist}<br>` +
                `£${song.price} | Stock: ${song.quantity} | Downloads: ${song.downloads}`;
        resultsDiv.appendChild(p);
        // 2) Create a Buy button using DOM
        const btn = document.createElement("button");
        // Use text node as requested
        const btnText = document.createTextNode("Buy physical copy");
        btn.appendChild(btnText);
        // 3) Add event listener (arrow function, async)
        btn.addEventListener("click", async (e) => {
            // Call buy route with the current song id
            await buySong(song.id);
        });
        // 4) Append the button to results div
        resultsDiv.appendChild(btn);
        // Optional: add a divider line
        resultsDiv.appendChild(document.createElement("hr"));
    });
}
function wireUp() {
    const input = getEl("theArtist");
    const btn = getEl("search");
    btn.addEventListener("click", async () => {
        await fetchByArtist(input.value);
    });
}
wireUp();
