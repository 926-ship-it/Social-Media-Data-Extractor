import React, { useState, useEffect } from 'react';
import { Copy, Check, BarChart3, Table as TableIcon, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ParsedRow } from '../types';

interface ResultsViewerProps {
  rawText: string;
}

const ITEMS_PER_PAGE = 10;

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ rawText }) => {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'raw' | 'charts'>('table');
  const [cleanTsv, setCleanTsv] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Reset to page 1 when new data arrives
    setCurrentPage(1);

    // 1. Extract TSV content from potential Markdown code blocks
    let content = rawText;
    
    // More permissive regex to catch tsv, csv, text, or just markdown blocks
    const codeBlockMatch = rawText.match(/```(?:tsv|csv|plaintext|text|markdown)?\n([\s\S]*?)```/i);
    
    if (codeBlockMatch) {
      content = codeBlockMatch[1];
    } else {
        // If no code blocks, check for tabular structure
        const lines = rawText.split('\n');
        // Look for lines with tabs or pipes
        const tableStart = lines.findIndex(line => line.includes('\t') || line.includes('|'));
        if (tableStart !== -1) {
            content = lines.slice(tableStart).join('\n');
        }
    }

    setCleanTsv(content.trim());

    // 2. Parse TSV/Markdown to JSON
    const lines = content.trim().split('\n');
    const data: ParsedRow[] = [];
    
    if (lines.length > 0) {
      // Heuristic: Skip header if present
      let startIndex = 0;
      const firstLineLower = lines[0].toLowerCase();
      // Check for common header keywords
      if (
        firstLineLower.includes('username') || 
        firstLineLower.includes('用户名') || 
        firstLineLower.includes('---') // Markdown separator
      ) {
          startIndex = 1;
          // If the second line is also a separator (e.g. |---|---|), skip it too
          if (lines.length > 1 && lines[1].includes('---')) {
            startIndex = 2;
          }
      }

      for (let i = startIndex; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        if (line.includes('---')) continue; // Skip separator lines just in case

        let columns: string[] = [];
        
        // Handle Markdown Table Format (start/end with pipe)
        if (line.includes('|')) {
          // Remove leading/trailing pipes if they exist
          if (line.startsWith('|')) line = line.substring(1);
          if (line.endsWith('|')) line = line.substring(0, line.length - 1);
          columns = line.split('|').map(c => c.trim());
        } else {
          // Assume TSV
          columns = line.split('\t').map(c => c.trim());
        }
        
        // RELAXED PARSING: Accept rows with at least 2 columns
        if (columns.length >= 2) {
          const rawViews = columns[3]?.replace(/,/g, '') || '0';
          const views = parseInt(rawViews) || 0;

          data.push({
            username: columns[0] || 'N/A',
            link: columns[1] || '',
            followers: columns[2] || '',
            views: views,
            contentType: columns[4] || '图文',
            tags: columns[5] || '',
            region: columns[6] || '',
            malePct: columns[7] || 'N/A',
            femalePct: columns[8] || 'N/A',
            ageDist: columns[9] || 'N/A',
          });
        }
      }
    }
    setParsedData(data);
  }, [rawText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanTsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getContentData = () => {
      const counts: Record<string, number> = {};
      parsedData.forEach(row => {
          const type = row.contentType || 'Unknown';
          counts[type] = (counts[type] || 0) + 1;
      });
      return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  };

  // Pagination Logic
  const totalPages = Math.ceil(parsedData.length / ITEMS_PER_PAGE);
  const currentRows = parsedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
      <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
        <div className="flex items-center space-x-4">
            <h3 className="font-semibold text-slate-800">Extraction Results ({parsedData.length})</h3>
            <div className="flex bg-slate-200 rounded-lg p-1 space-x-1">
                <button
                    onClick={() => setActiveTab('table')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    <span className="flex items-center gap-2"><TableIcon className="w-4 h-4" /> Table</span>
                </button>
                <button
                    onClick={() => setActiveTab('charts')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'charts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    disabled={parsedData.length === 0}
                >
                    <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Charts</span>
                </button>
                <button
                    onClick={() => setActiveTab('raw')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'raw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Raw TSV</span>
                </button>
            </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy for Excel'}
        </button>
      </div>

      <div className="p-0">
        {activeTab === 'raw' && (
             <div className="bg-slate-900 p-4 overflow-x-auto">
             <pre className="font-mono text-sm text-green-400 whitespace-pre leading-relaxed">
               {cleanTsv}
             </pre>
           </div>
        )}

        {activeTab === 'table' && (
             <div className="flex flex-col">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                     <tr>
                       <th className="px-4 py-3 whitespace-nowrap min-w-[100px]">Username</th>
                       <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">Link</th>
                       <th className="px-4 py-3 whitespace-nowrap">Followers</th>
                       <th className="px-4 py-3 whitespace-nowrap">Views</th>
                       <th className="px-4 py-3 whitespace-nowrap">Type</th>
                       <th className="px-4 py-3 whitespace-nowrap min-w-[120px]">Tags</th>
                       <th className="px-4 py-3 whitespace-nowrap">Region</th>
                       {/* New Columns */}
                       <th className="px-4 py-3 whitespace-nowrap bg-blue-50/50">Male %</th>
                       <th className="px-4 py-3 whitespace-nowrap bg-pink-50/50">Female %</th>
                       <th className="px-4 py-3 whitespace-nowrap">Age Dist.</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {currentRows.map((row, idx) => (
                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                         <td className="px-4 py-3 font-medium text-slate-900">{row.username}</td>
                         <td className="px-4 py-3">
                             {row.link ? (
                                 <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-xs block min-w-[150px]">
                                     {row.link}
                                 </a>
                             ) : (
                                <span className="text-slate-400 text-xs italic">No Link</span>
                             )}
                         </td>
                         <td className="px-4 py-3 text-slate-600 font-medium">{row.followers}</td>
                         <td className="px-4 py-3 text-slate-600">{row.views.toLocaleString()}</td>
                         <td className="px-4 py-3">
                             <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                 row.contentType.includes('视频') ? 'bg-purple-100 text-purple-700' :
                                 row.contentType.includes('图文') ? 'bg-pink-100 text-pink-700' :
                                 'bg-slate-100 text-slate-700'
                             }`}>
                                 {row.contentType}
                             </span>
                         </td>
                         <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">{row.tags}</td>
                         <td className="px-4 py-3 text-slate-600">{row.region}</td>
                         <td className="px-4 py-3 text-slate-600 bg-blue-50/30">{row.malePct}</td>
                         <td className="px-4 py-3 text-slate-600 bg-pink-50/30">{row.femalePct}</td>
                         <td className="px-4 py-3 text-slate-600 text-xs">{row.ageDist}</td>
                       </tr>
                     ))}
                     {parsedData.length === 0 && (
                       <tr>
                         <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                           <div className="flex flex-col items-center gap-2">
                             <p>No data parsed automatically.</p>
                             <p className="text-sm">Please check the <strong>Raw TSV</strong> tab.</p>
                           </div>
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
               
               {/* Pagination Controls */}
               {parsedData.length > ITEMS_PER_PAGE && (
                 <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50">
                   <div className="text-sm text-slate-500">
                     Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, parsedData.length)}</span> of <span className="font-medium">{parsedData.length}</span> results
                   </div>
                   <div className="flex items-center space-x-2">
                     <button
                       onClick={handlePrevPage}
                       disabled={currentPage === 1}
                       className="p-1 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <ChevronLeft className="w-5 h-5" />
                     </button>
                     <span className="text-sm font-medium text-slate-700 px-2">
                       Page {currentPage} of {totalPages}
                     </span>
                     <button
                       onClick={handleNextPage}
                       disabled={currentPage === totalPages}
                       className="p-1 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <ChevronRight className="w-5 h-5" />
                     </button>
                   </div>
                 </div>
               )}
             </div>
        )}

        {activeTab === 'charts' && (
            <div className="p-8">
                 <div className="h-80 border border-slate-100 rounded-lg p-6 bg-white shadow-sm max-w-3xl mx-auto">
                    <h4 className="text-lg font-medium text-slate-700 mb-6 text-center">Content Type Breakdown</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getContentData()}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};