"use client"
import { useState, useMemo } from 'react'
import { Folder, FolderOpen, FileCode, FileText, ChevronRight, ChevronDown, Star, Play } from 'lucide-react'

// buildTree: organizes flat file list into a nested directory structure
function buildTree(files) {
  const root = { name: 'root', children: {}, files: [] }
  for (const f of files) {
    const parts = f.name.replace(/\\/g, '/').split('/')
    let cur = root
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur.children[parts[i]]) cur.children[parts[i]] = { name: parts[i], children: {}, files: [] }
      cur = cur.children[parts[i]]
    }
    cur.files.push(f)
  }
  return root
}

function FileIcon({ file }) {
  if (file.isSourceFile) return <FileCode className="w-3.5 h-3.5 text-cyan flex-shrink-0" />
  if (file.isInputFile) return <FileText className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
  if (file.isExpectedFile) return <FileText className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
  return <FileText className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
}

function TreeNode({ node, depth = 0, onFileClick, selectedFile, entryFile, onSetEntry }) {
  const [open, setOpen] = useState(depth < 2)
  const dirs = Object.values(node.children)
  const hasContent = dirs.length > 0 || node.files.length > 0

  return (
    <div>
      {node.name !== 'root' && (
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 w-full text-left py-0.5 px-2 hover:bg-white/5 rounded transition-colors text-xs"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {open ? <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />}
          {open ? <FolderOpen className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" /> : <Folder className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
          <span className="text-gray-300 truncate">{node.name}</span>
        </button>
      )}

      {(node.name === 'root' || open) && (
        <>
          {dirs.map(dir => (
            <TreeNode key={dir.name} node={dir} depth={node.name === 'root' ? 0 : depth + 1}
              onFileClick={onFileClick} selectedFile={selectedFile} entryFile={entryFile} onSetEntry={onSetEntry} />
          ))}
          {node.files.map(f => {
            const isSelected = selectedFile?.name === f.name
            const isEntry = entryFile === f.name
            return (
              <div key={f.name}
                className={`flex items-center gap-1.5 py-0.5 rounded transition-colors cursor-pointer group ${isSelected ? 'bg-cyan/10' : 'hover:bg-white/5'}`}
                style={{ paddingLeft: `${(node.name === 'root' ? 0 : depth + 1) * 12 + 20}px`, paddingRight: '8px' }}
                onClick={() => onFileClick(f)}
              >
                <FileIcon file={f} />
                <span className={`text-xs truncate flex-1 ${isSelected ? 'text-cyan' : 'text-gray-300'}`}>
                  {f.name.split('/').pop()}
                </span>
                {f.hasMain && (
                  <button
                    title="Set as entry point"
                    onClick={e => { e.stopPropagation(); onSetEntry(f.name) }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${isEntry ? 'opacity-100 text-success' : 'text-gray-500 hover:text-cyan'}`}
                  >
                    <Star className={`w-3 h-3 ${isEntry ? 'fill-success text-success' : ''}`} />
                  </button>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

export default function ZipFileExplorer({ files = [], onFileClick, selectedFile, entryFile, onSetEntry, language }) {
  const tree = useMemo(() => buildTree(files), [files])
  const sourceFiles = files.filter(f => f.isSourceFile)
  const mainFiles = files.filter(f => f.isSourceFile && f.hasMain)
  const inputFiles = files.filter(f => f.isInputFile)
  const expectedFiles = files.filter(f => f.isExpectedFile)

  return (
    <div className="flex flex-col h-full bg-navy-2 border-r border-white/10">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project Files</div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded bg-cyan/10 text-cyan border border-cyan/20">
            {sourceFiles.length} src
          </span>
          {inputFiles.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              {inputFiles.length} input
            </span>
          )}
          {expectedFiles.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              {expectedFiles.length} expected
            </span>
          )}
          {mainFiles.length > 1 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {mainFiles.length} mains
            </span>
          )}
        </div>
      </div>

      {/* Entry file hint */}
      {mainFiles.length > 1 && !entryFile && (
        <div className="mx-2 mt-2 p-2 rounded bg-warning/10 border border-warning/30">
          <div className="text-xs text-warning flex items-center gap-1.5">
            <Star className="w-3 h-3" />
            Select an entry file (★) to run
          </div>
        </div>
      )}
      {entryFile && (
        <div className="mx-2 mt-2 p-2 rounded bg-success/10 border border-success/30">
          <div className="text-xs text-success flex items-center gap-1 truncate">
            <Play className="w-3 h-3 flex-shrink-0" />
            Entry: {entryFile.split('/').pop()}
          </div>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        <TreeNode node={tree} onFileClick={onFileClick} selectedFile={selectedFile} entryFile={entryFile} onSetEntry={onSetEntry} />
      </div>

      {/* Preview pane */}
      {selectedFile && (
        <div className="border-t border-white/10">
          <div className="px-3 py-1.5 bg-navy border-b border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-400 truncate">{selectedFile.name.split('/').pop()}</span>
            <span className="text-xs text-gray-600">{(selectedFile.size / 1024).toFixed(1)} KB</span>
          </div>
          <pre className="p-3 text-xs font-mono text-gray-300 overflow-auto max-h-48 bg-navy leading-relaxed">
            {selectedFile.content || '[Binary or empty file]'}
          </pre>
        </div>
      )}
    </div>
  )
}
