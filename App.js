import React, { useEffect, useState } from 'react';

/**
 * YouTube Comment Helper (Safe)
 * - Fetches latest videos via YouTube Data API v3
 * - Lets you upload a PDF/TXT/CSV bank of comments
 * - One click: copies selected comment & opens the video
 * - (Optional) Use the provided Chrome extension to auto-fill the comment box
 *   by appending the comment in the URL hash (no auto-posting).
 */

// Lazy PDF text extraction
async function extractTextFromPDF(file) {
  const pdfjs = await import('pdfjs-dist');
  // set worker
  try {
    const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs');
    // @ts-ignore
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  } catch {}
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(it => it.str || '').join(' ') + '\n';
  }
  return text;
}

function parseComments(raw) {
  const parts = raw.split(/\r?\n|,/g).map(s => s.trim()).filter(Boolean);
  return Array.from(new Set(parts));
}

async function readFileAsText(file) {
  if (file.type === 'application/pdf') {
    return await extractTextFromPDF(file);
  }
  return await file.text();
}

function usePersistent(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState];
}

export default function App() {
  const [apiKey, setApiKey] = usePersistent('apiKey', '');
  const [channelId, setChannelId] = usePersistent('channelId', '');
  const [maxResults, setMaxResults] = usePersistent('maxResults', 12);
  const [comments, setComments] = usePersistent('comments', []);
  const [newComment, setNewComment] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(null);

  const [accounts, setAccounts] = usePersistent('accounts', Array.from({length:10}, (_,i)=>`Account ${i+1}`));
  const [activeAcc, setActiveAcc] = usePersistent('activeAcc', 0);

  const [videos, setVideos] = usePersistent('videos', []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLatest = async () => {
    setError('');
    if (!apiKey || !channelId) { setError('Add API key and Channel ID in Settings.'); return; }
    setLoading(true);
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('channelId', channelId);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('order', 'date');
      url.searchParams.set('maxResults', String(maxResults));
      url.searchParams.set('type', 'video');
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('YouTube API error ' + res.status);
      const data = await res.json();
      const vids = (data.items || []).map(it => ({
        id: it.id.videoId,
        title: it.snippet.title,
        publishedAt: it.snippet.publishedAt,
        thumb: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url,
      }));
      setVideos(vids);
    } catch (e) {
      setError(e.message || 'Failed to fetch.');
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async (file) => {
    try {
      const text = await readFileAsText(file);
      const parsed = parseComments(text);
      setComments(prev => Array.from(new Set([...prev, ...parsed])));
    } catch (e) {
      setError('Could not read file: ' + (e.message || e));
    }
  };

  const copyAndOpen = async (v) => {
    const idx = selectedIdx ?? 0;
    if (!comments[idx]) { setError('Add at least one comment and select it.'); return; }
    const c = comments[idx];
    try {
      await navigator.clipboard.writeText(c);
    } catch {}
    // Pass comment via hash for the extension to read
    const url = `https://www.youtube.com/watch?v=${v.id}#ych_comment=${encodeURIComponent(c)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const removeComment = (i) => {
    setComments(prev => prev.filter((_,idx)=>idx!==i));
    if (selectedIdx === i) setSelectedIdx(null);
  };

  return (
    <div className="container">
      <div className="row" style={{justifyContent:'space-between'}}>
        <div className="title">YouTube Comment Helper</div>
        <div className="row">
          <button className="btn" onClick={fetchLatest} disabled={loading}>{loading ? 'Loading…' : 'Fetch Latest'}</button>
          <a className="btn outline" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Get API Key</a>
        </div>
      </div>

      <div className="space"></div>

      <div className="card">
        <div className="row" style={{gap: '16px'}}>
          <div style={{flex:1, minWidth:260}}>
            <div className="small muted">YouTube Data API Key</div>
            <input className="input" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="AIza..." />
          </div>
          <div style={{flex:1, minWidth:260}}>
            <div className="small muted">Channel ID</div>
            <input className="input" value={channelId} onChange={e=>setChannelId(e.target.value)} placeholder="UCxxxxxxxxxxxxxxxx" />
          </div>
          <div style={{width:140}}>
            <div className="small muted">Max Results</div>
            <input className="input" type="number" min="1" max="50" value={maxResults} onChange={e=>setMaxResults(Number(e.target.value || 12))} />
          </div>
        </div>
        <div className="small muted" style={{marginTop:8}}>This tool only speeds up manual commenting. It does not auto-post or increase views/likes.</div>
      </div>

      <div className="space"></div>

      <div className="grid grid-2">
        <div className="card">
          <div className="title" style={{fontSize:18}}>Comment Bank</div>
          <div className="row">
            <label className="small muted">Add via file (PDF/TXT/CSV)</label>
            <input type="file" accept=".pdf,.txt,.csv" onChange={e=> e.target.files?.[0] && onUpload(e.target.files[0])} />
          </div>
          <div className="row" style={{alignItems:'flex-start'}}>
            <textarea className="textarea" value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Type a new comment..."></textarea>
            <button className="btn" onClick={()=>{
              const c = newComment.trim();
              if(!c) return;
              setComments(prev=> Array.from(new Set([c, ...prev])));
              setNewComment('');
              setSelectedIdx(0);
            }}>Add</button>
          </div>
          <div className="list">
            {comments.length === 0 ? <div className="muted small">No comments yet.</div> : null}
            {comments.map((c,i)=>(
              <div key={i} className={`list-item ${i===selectedIdx ? 'active':''}`} onClick={()=>setSelectedIdx(i)}>
                <div className="small" style={{flex:1}}>{c}</div>
                <button className="btn outline" onClick={(e)=>{e.stopPropagation(); removeComment(i);}}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="title" style={{fontSize:18}}>Accounts Tracker</div>
          <div className="row">
            {accounts.map((acc,i)=>(
              <div key={i} className={`pill ${i===activeAcc?'active':''}`} onClick={()=>setActiveAcc(i)}>{acc}</div>
            ))}
            <button className="btn outline small" onClick={()=>setAccounts(prev=>[...prev, `Account ${prev.length+1}`])}>+ Add</button>
          </div>
          <div className="muted small">This is only for your tracking; the app does not log in or post.</div>
        </div>
      </div>

      <div className="space"></div>

      <div className="card">
        <div className="title" style={{fontSize:18}}>Latest Uploads</div>
        {error ? <div className="error">{error}</div> : null}
        {loading ? <div className="small">Loading…</div> : null}
        {(!loading && videos.length === 0) ? <div className="muted small">Click <b>Fetch Latest</b> after adding API key & Channel ID.</div> : null}
        <div className="grid grid-3" style={{marginTop:12}}>
          {videos.map(v => (
            <div key={v.id} className="card">
              <img src={v.thumb} alt={v.title} className="thumb" />
              <div style={{fontWeight:600, fontSize:14, marginTop:8}}>{v.title}</div>
              <div className="muted small">{new Date(v.publishedAt).toLocaleString()}</div>
              <div className="row" style={{marginTop:8}}>
                <button className="btn" onClick={()=>copyAndOpen(v)}>Copy & Open</button>
                <a className="btn outline" href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer">Open</a>
              </div>
              <div className="muted small">Using: <b>{accounts[activeAcc] || 'Account'}</b> · Comment #{(selectedIdx ?? 0) + 1}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space"></div>

      <div className="card">
        <div className="title" style={{fontSize:18}}>Stay Safe & Fast</div>
        <div className="small">• This tool speeds up manual commenting only. It does not submit comments or affect views/likes.</div>
        <div className="small">• Optional Chrome extension included in this bundle can auto-fill the comment box using the URL hash. You still press <em>Post</em> yourself.</div>
      </div>
    </div>
  );
}
