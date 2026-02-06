"use strict";
console.log("index.ts loaded");
function getEl(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Missing element with id="${id}"`);
    return el;
}
async function fetchByArtist(artist) {
    const resultsDiv = getEl("htresults");
    const trimmed = artist.trim();
    if (trimmed === "") {
        resultsDiv.innerHTML = "Please enter an artist.";
        return;
    }
    resultsDiv.innerHTML = "Loading...";
    const resp = await fetch(`/artist/${encodeURIComponent(trimmed)}`);
    if (!resp.ok) {
        resultsDiv.innerHTML = `Error fetching songs (HTTP ${resp.status})`;
        return;
    }
    const songs = await resp.json();
    if (songs.length === 0) {
        resultsDiv.innerHTML = "No songs found.";
        return;
    }
    resultsDiv.innerHTML = songs
        .map((s) => `
      <div>
        <strong>${s.title}</strong> (${s.year})<br>
        Artist: ${s.artist}<br>
        £${s.price} | Stock: ${s.quantity} | Downloads: ${s.downloads}
        <hr>
      </div>
    `)
        .join("");
}
function wireUp() {
    const input = getEl("theArtist");
    const btn = getEl("search");
    btn.addEventListener("click", async () => {
        console.log("Search clicked:", input.value);
        await fetchByArtist(input.value);
    });
}
wireUp();
