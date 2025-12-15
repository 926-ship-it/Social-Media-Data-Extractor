import React, { useState, useEffect } from 'react';
import { Copy, Check, BarChart3, Table as TableIcon, FileText, ChevronLeft, ChevronRight, Pencil, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ParsedRow } from '../types';

interface ResultsViewerProps {
  rawText: string;
}

const ITEMS_PER_PAGE = 10;

// Updated headers matching the new 9-column format (+ Index)
const DEFAULT_HEADERS = {
  index: '编号',
  username: '用户名',
  link: '链接',
  followers: '粉丝数',
  views: '浏览数', // Now typically "平均浏览" or just "浏览数"
  contentType: '内容形式',
  niche: '领域/赛道',
  language: '语言',
  genderDist: '受众性别',
  ageDist: '受众年龄占比'
};

type HeaderKey = keyof typeof DEFAULT_HEADERS;

// Helper to parse "7.89万" or "1.5M" to number for sorting/charts
const parseMetricToNumber = (value: string): number => {
  if (!value) return 0;
  let numStr = value.replace(/,/g, '');
  let multiplier = 1;
  
  if (numStr.includes('万') || numStr.toLowerCase().includes('w')) {
    multiplier = 10000;
    numStr = numStr.replace(/万|w/gi, '');
  } else if (numStr.toLowerCase().includes('k')) {
    multiplier = 1000;
    numStr = numStr.replace(/k/gi, '');
  } else if (numStr.toLowerCase().includes('m')) {
    multiplier = 1000000;
    numStr = numStr.replace(/m/gi, '');
  }
  
  const parsed = parseFloat(numStr);
  return isNaN(parsed) ? 0 : parsed * multiplier;
};

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ rawText }) => {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'raw' | 'charts'>('table');
  const [cleanTsv, setCleanTsv] = useState('');
  
  // Header Customization State
  const [headers, setHeaders] = useState(DEFAULT_HEADERS);
  const [isEditingHeaders, setIsEditingHeaders] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);

    let content = rawText;
    const codeBlockMatch = rawText.match(/```(?:tsv|csv|plaintext|text|markdown)?\n([\s\S]*?)```/i);
    
    if (codeBlockMatch) {
      content = codeBlockMatch[1];
    } else {
        const lines = rawText.split('\n');
        const tableStart = lines.findIndex(line => line.includes('\t') || line.includes('|'));
        if (tableStart !== -1) {
            content = lines.slice(tableStart).join('\n');
        }
    }

    setCleanTsv(content.trim());

    const lines = content.trim().split('\n');
    const data: ParsedRow[] = [];
    
    if (lines.length > 0) {
      let startIndex = 0;
      const firstLineLower = lines[0].toLowerCase();
      // Skip header lines if found
      if (firstLineLower.includes('username') || firstLineLower.includes('用户名')) {
          startIndex = 1;
          if (lines.length > 1 && lines[1].includes('---')) {
            startIndex = 2;
          }
      }

      for (let i = startIndex; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        if (line.includes('---')) continue;

        let columns: string[] = [];
        if (line.includes('|')) {
          if (line.startsWith('|')) line = line.substring(1);
          if (line.endsWith('|')) line = line.substring(0, line.length - 1);
          columns = line.split('|').map(c => c.trim());
        } else {
          columns = line.split('\t').map(c => c.trim());
        }
        
        // Ensure we have enough columns for the new 9-col schema
        if (columns.length >= 4) {
          const viewsStr = columns[3] || '0';
          const numericViews = parseMetricToNumber(viewsStr);

          data.push({
            username: columns[0] || 'N/A',
            link: columns[1] || '',
            followers: columns[2] || '',
            views: viewsStr,
            numericViews: numericViews,
            contentType: columns[4] || '',
            niche: columns[5] || '',
            language: columns[6] || '',
            genderDist: columns[7] || '',
            ageDist: columns[8] || '',
          });
        }
      }
    }
    setParsedData(data);
  }, [rawText]);

  const generateExportTsv = () => {
    // 1. Header Row
    const headerRow = [
      headers.index,
      headers.username,
      headers.link,
      headers.followers,
      headers.views,
      headers.contentType,
      headers.niche,
      headers.language,
      headers.genderDist,
      headers.ageDist
    ].join('\t');

    // 2. Data Rows (with Auto-Index)
    const bodyRows = parsedData.map((row, index) => [
      index + 1, // Auto-generate ID
      row.username,
      row.link,
      row.followers,
      row.views,
      row.contentType,
      row.niche,
      row.language,
      row.genderDist,
      row.ageDist
    ].join('\t')).join('\n');

    return `${headerRow}\n${bodyRows}`;
  };

  const handleCopy = () => {
    const textToCopy = generateExportTsv();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHeaderChange = (key: HeaderKey, value: string) => {
    setHeaders(prev => ({ ...prev, [key]: value }));
  };

  const resetHeaders = () => {
    setHeaders(DEFAULT_HEADERS);
  };

  const getContentData = () => {
      const counts: Record<string, number> = {};
      parsedData.forEach(row => {
          const type = row.contentType || 'Unknown';
          counts[type] = (counts[type] || 0) + 1;
      });
      return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  };

  const totalPages = Math.ceil(parsedData.length / ITEMS_PER_PAGE);
  const currentRows = parsedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };

  const renderHeaderCell = (key: HeaderKey, widthClass: string = '') => (
    <th className={`px-4 py-3 whitespace-nowrap text-left ${widthClass}`}>
      {isEditingHeaders ? (
        <input
          type="text"
          value={headers[key]}
          onChange={(e) => handleHeaderChange(key, e.target.value)}
          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none text-slate-900"
        />
      ) : (
        headers[key]
      )}
    </th>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
      <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
        <div className="flex items-center space-x-4">
            <h3 className="font-semibold text-slate-800">Results ({parsedData.length})</h3>
            <div className="flex bg-slate-200 rounded-lg p-1 space-x-1">
                <button onClick={() => setActiveTab('table')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}><span className="flex items-center gap-2"><TableIcon className="w-4 h-4" /> Table</span></button>
                <button onClick={() => setActiveTab('charts')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'charts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`} disabled={parsedData.length === 0}><span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Charts</span></button>
                <button onClick={() => setActiveTab('raw')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'raw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}><span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Raw</span></button>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {activeTab === 'table' && (
              <div className="flex items-center mr-2 bg-white rounded-lg border border-slate-200 p-0.5">
                {isEditingHeaders ? (
                  <>
                     <button onClick={() => setIsEditingHeaders(false)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md" title="Save"><Check className="w-4 h-4" /></button>
                     <button onClick={resetHeaders} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md" title="Reset"><RotateCcw className="w-4 h-4" /></button>
                  </>
                ) : (
                   <button onClick={() => setIsEditingHeaders(true)} className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-md text-sm font-medium" title="Edit Columns"><Pencil className="w-3.5 h-3.5" /><span className="hidden sm:inline">Edit Headers</span></button>
                )}
              </div>
            )}
            <button onClick={handleCopy} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied!' : 'Copy to Excel'}</button>
        </div>
      </div>

      <div className="p-0">
        {activeTab === 'raw' && (
             <div className="bg-slate-900 p-4 overflow-x-auto"><pre className="font-mono text-sm text-green-400 whitespace-pre leading-relaxed">{cleanTsv}</pre></div>
        )}

        {activeTab === 'table' && (
             <div className="flex flex-col">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                     <tr>
                       {renderHeaderCell('index', 'w-12 text-center')}
                       {renderHeaderCell('username')}
                       {renderHeaderCell('link')}
                       {renderHeaderCell('followers')}
                       {renderHeaderCell('views')}
                       {renderHeaderCell('contentType')}
                       {renderHeaderCell('niche')}
                       {renderHeaderCell('language')}
                       {renderHeaderCell('genderDist')}
                       {renderHeaderCell('ageDist')}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {currentRows.map((row, idx) => {
                       const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                       return (
                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                         <td className="px-4 py-3 text-center text-slate-500 font-mono text-xs">{globalIndex}</td>
                         <td className="px-4 py-3 font-medium text-slate-900">{row.username}</td>
                         <td className="px-4 py-3">
                             {row.link ? <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-xs block min-w-[120px]">{row.link}</a> : <span className="text-slate-400 text-xs">No Link</span>}
                         </td>
                         <td className="px-4 py-3 text-slate-600">{row.followers}</td>
                         <td className="px-4 py-3 text-slate-600">{row.views}</td>
                         <td className="px-4 py-3"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.contentType}</span></td>
                         <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{row.niche}</td>
                         <td className="px-4 py-3 text-slate-600">{row.language}</td>
                         <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{row.genderDist}</td>
                         <td className="px-4 py-3 text-slate-600 text-xs min-w-[200px]">{row.ageDist}</td>
                       </tr>
                     )})}
                     {parsedData.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">No data parsed.</td></tr>}
                   </tbody>
                 </table>
               </div>
               
               {parsedData.length > ITEMS_PER_PAGE && (
                 <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50">
                   <div className="text-sm text-slate-500">Page {currentPage} of {totalPages}</div>
                   <div className="flex items-center space-x-2">
                     <button onClick={handlePrevPage} disabled={currentPage === 1} className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
                     <button onClick={handleNextPage} disabled={currentPage === totalPages} className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
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
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
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