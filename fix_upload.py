with open('frontend/src/pages/LoanDetail.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the upload button block and replace it
new_block = [
    "                          <div className=\"flex gap-2\">\n",
    "                            <input\n",
    "                              placeholder=\"Paste secure file URL...\"\n",
    "                              className=\"input py-2 text-xs flex-1\"\n",
    "                              value={uploadLinks[req.id] || ''}\n",
    "                              onChange={e => {\n",
    "                                const val = e.target.value;\n",
    "                                setUploadLinks(prev => ({ ...prev, [req.id]: val }));\n",
    "                              }}\n",
    "                            />\n",
    "                            <button\n",
    "                              onClick={() => handleUpload(req.id)}\n",
    "                              disabled={actionLoading || !uploadLinks[req.id]}\n",
    "                              className=\"btn-primary py-2 px-3 text-xs disabled:opacity-50\"\n",
    "                            >\n",
    "                              <UploadCloud className=\"w-4 h-4\" />\n",
    "                            </button>\n",
    "                          </div>\n",
]

# Find start line (the div containing the input)
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if 'Paste secure file URL' in line:
        # Go backwards to find opening div
        for j in range(i, max(0, i-5), -1):
            if '<div className="flex gap-2">' in lines[j]:
                start_idx = j
                break
    if start_idx is not None and i > start_idx and '</div>' in line and end_idx is None:
        end_idx = i
        break

if start_idx is None or end_idx is None:
    print(f'Could not find block. start={start_idx} end={end_idx}')
else:
    print(f'Found block: lines {start_idx+1} to {end_idx+1}')
    for l in lines[start_idx:end_idx+1]:
        print(repr(l))
    lines[start_idx:end_idx+1] = new_block
    with open('frontend/src/pages/LoanDetail.jsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('SUCCESS - file written')
