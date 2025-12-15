import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultsViewer } from './components/ResultsViewer';
import { processFiles } from './services/geminiService';
import { UploadFile } from './types';
import { Sparkles, FileSearch, AlertCircle, Loader2, globe, LayoutGrid } from 'lucide-react';

const PLATFORMS = [
  { id: 'Auto-detect', name: 'Auto-detect (自动检测)' },
  { id: 'TikTok', name: 'TikTok' },
  { id: 'Instagram', name: 'Instagram' },
  { id: 'YouTube', name: 'YouTube' },
  { id: 'Xiaohongshu', name: 'Xiaohongshu (小红书)' },
  { id: 'Facebook', name: 'Facebook' },
  { id: 'Twitter', name: 'Twitter/X' },
];

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [platform, setPlatform] = useState<string>('Auto-detect');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Extract the raw File objects from the wrapper
      const rawFiles = files.map(f => f.file);
      // Pass the selected platform to the service
      const textResponse = await processFiles(rawFiles, platform);
      setResult(textResponse);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setPlatform('Auto-detect');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-xl shadow-lg mb-4">
            <FileSearch className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Social Media Data Extractor
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Upload screenshots, Word docs, or Excel files. 
            We'll extract and structure the analytics data into an Excel-ready format.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          
          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-sm">1</span>
                Upload Files
              </h2>

              {/* Platform Selector */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <LayoutGrid className="w-4 h-4 text-slate-500 ml-2" />
                <label htmlFor="platform-select" className="text-sm font-medium text-slate-600 mr-1">Platform:</label>
                <select
                  id="platform-select"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={isProcessing}
                  className="bg-white border-0 text-slate-800 text-sm rounded-md focus:ring-2 focus:ring-blue-500 py-1.5 pl-2 pr-8 cursor-pointer shadow-sm hover:bg-slate-50 transition-colors outline-none"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <ImageUploader 
              files={files} 
              setFiles={setFiles} 
              disabled={isProcessing} 
            />

            {files.length > 0 && (
              <div className="mt-6 flex justify-end gap-3">
                 <button
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Start Extraction
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-800 font-medium">Extraction Failed</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Results Section */}
          {result && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-sm">2</span>
                Results
              </h2>
              <ResultsViewer rawText={result} />
            </div>
          )}
          
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-slate-400 text-sm">
          <p>Powered by Google Gemini 2.5 Flash</p>
        </div>
      </div>
    </div>
  );
};

export default App;