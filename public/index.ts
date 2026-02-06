console.log("index.ts loaded");

type Song = {
  id: number;
  title: string;
  artist: string;
  year: number;
  downloads: number;
  price: number;
  quantity: number;
};

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element with id="${id}"`);
  return el as T;
}

async function fetchByArtist(artist: string): Promise<void> {
  const resultsDiv = getEl<HTMLDivElement>("htresults");

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

  const songs: Song[] = await resp.json();

  if (songs.length === 0) {
    resultsDiv.innerHTML = "No songs found.";
    return;
  }

  resultsDiv.innerHTML = songs
    .map(
      (s) => `
      <div>
        <strong>${s.title}</strong> (${s.year})<br>
        Artist: ${s.artist}<br>
        £${s.price} | Stock: ${s.quantity} | Downloads: ${s.downloads}
        <hr>
      </div>
    `
    )
    .join("");
}

function wireUp(): void {
  const input = getEl<HTMLInputElement>("theArtist");
  const btn = getEl<HTMLButtonElement>("search");

  btn.addEventListener("click", async () => {
    console.log("Search clicked:", input.value);
    await fetchByArtist(input.value);
  });
}

wireUp();
