// Library imports
import { useState, useRef } from 'react';
// Custom imports
import { MODEL_NAMES, IMPORT_ORDER, type ModelName } from '@/util/ModelRegistry';

/** A single entry in the status log displayed at the bottom of the tab. */
type StatusMessage = {
    /** The message text */
    text : string;
    /** Controls the colour: green for success, red for error, grey for info */
    type : 'success' | 'error' | 'info';
};

/**
 * Tab content for the "Import / Export" panel inside {@link DatabaseModal}.
 *
 * **Export section** (left column):
 * - Select a model and download its data as a CSV file
 * - "Export All" downloads a separate CSV for every model
 *
 * **Import section** (right column):
 * - Select a model, pick a CSV file, and upload it for upsert
 * - "Import All" accepts multiple {@code export-ModelName.csv} files and
 *   imports them in FK-safe order (see {@link IMPORT_ORDER})
 * - "Fix Sequences" resets Postgres auto-increment sequences after import
 *
 * All operations report progress in a scrollable status log at the bottom.
 */
const ImportExportTab: React.FC = () => {
    // Export state
    const [exportModel,   setExportModel]   = useState<ModelName>('User');
    const [exporting,     setExporting]     = useState(false);
    const [exportingAll,  setExportingAll]  = useState(false);
    
    // Import state
    const [importModel,   setImportModel]   = useState<ModelName>('User');
    const [importingAll,  setImportingAll]  = useState(false);
    const [importing,     setImporting]     = useState(false);
    const [fixingSeqs,    setFixingSeqs]    = useState(false);
    const fileInputRef  = useRef<HTMLInputElement>(null);
    const allFilesRef   = useRef<HTMLInputElement>(null);
    
    // Status messages
    const [messages, setMessages] = useState<StatusMessage[]>([]);
    
    /**
     * Appends a new entry to the status log.
     *
     * @param text - The message to display
     * @param type - Visual style: {@code 'success'}, {@code 'error'}, or
     *               {@code 'info'}
     */
    const addMessage = (text: string, type: StatusMessage['type']) => {
        setMessages(prev => [...prev, { text, type }]);
    };
    
    /** Clears every entry from the status log. */
    const clearMessages = () => setMessages([]);
    
    // ====================================================================== //
    //                              E X P O R T                               //
    // ====================================================================== //
    /**
     * Fetches the CSV for a single model from the export API and triggers a
     * browser download.
     *
     * @param model - The model to export
     */
    const handleExport = async (model: ModelName) => {
        try {
            const res = await fetch(`/api/admin/db/export?model=${model}`);
            if (!res.ok) {
                const err = await res.json();
                addMessage(`Export ${model}: ${err.error}`, 'error');
                return;
            }
            
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `export-${model}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            addMessage(`Exported ${model}`, 'success');
        }
        catch (err: unknown) {
            addMessage(`Export ${model} failed: ${err instanceof Error? err.message : String(err)}`, 
                       'error');
        }
    };
    
    /** Exports the currently selected model. */
    const handleExportSingle = async () => {
        setExporting(true);
        clearMessages();
        await handleExport(exportModel);
        setExporting(false);
    };
    
    /** Exports every model sequentially, downloading one CSV per model. */
    const handleExportAll = async () => {
        setExportingAll(true);
        clearMessages();
        for (const model of MODEL_NAMES) {
            addMessage(`Exporting ${model}...`, 'info');
            await handleExport(model);
        }
        addMessage('All exports complete.', 'success');
        setExportingAll(false);
    };
    
    // ====================================================================== //
    //                              I M P O R T                               //
    // ====================================================================== //
    /**
     * Uploads a single CSV file to the import API for the given model and
     * logs the result.
     *
     * @param model - The target Prisma model
     * @param file  - The CSV file to upload
     */
    const uploadFile = async (model: ModelName, file: File): Promise<void> => {
        const formData = new FormData();
        formData.append('model', model);
        formData.append('file', file);
        
        const res = await fetch('/api/admin/db/import', {
            method: 'POST',
            body  : formData,
        });
        
        const result = await res.json();
        
        if (!res.ok) {
            addMessage(`Import ${model}: ${result.error}`, 'error');
            return;
        }
        
        addMessage(
            `Import ${model}: ${result.success} imported, ${result.skipped} skipped`
            + (result.errors?.length ? ` (${result.errors.length} errors)` : ''),
            result.skipped > 0 ? 'error' : 'success'
        );
    };
    
    /** Imports the file selected in the single-model file input. */
    const handleImportSingle = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            addMessage('Please select a CSV file', 'error');
            return;
        }
        
        setImporting(true);
        clearMessages();
        await uploadFile(importModel, file);
        setImporting(false);
    };
    
    /**
     * Imports all selected CSV files in FK-safe order. Files are matched
     * to models by their name (expected format: {@code export-ModelName.csv}).
     * Models with no matching file are skipped.
     */
    const handleImportAll = async () => {
        const files = allFilesRef.current?.files;
        if (!files || files.length === 0) {
            addMessage('Please select CSV files', 'error');
            return;
        }
        
        // Map files by model name (expected: export-ModelName.csv)
        const fileMap = new Map<string, File>();
        for (const file of Array.from(files)) {
            const match = file.name.match(/^export-(\w+)\.csv$/);
            if (match) {
                fileMap.set(match[1], file);
            }
        }
        
        setImportingAll(true);
        clearMessages();
        
        for (const model of IMPORT_ORDER) {
            const file = fileMap.get(model);
            if (file) {
                addMessage(`Importing ${model}...`, 'info');
                await uploadFile(model, file);
            }
            else {
                addMessage(`Skipping ${model} (no matching file)`, 'info');
            }
        }
        
        addMessage('All imports complete.', 'success');
        setImportingAll(false);
    };
    
    // ====================================================================== //
    //                        F I X   S E Q U E N C E                         //
    // ====================================================================== //
    /**
     * Calls the fix-sequence API to reset Postgres auto-increment sequences
     * for all models. Should be run after a bulk CSV import to prevent
     * P2002 unique-constraint errors.
     */
    const handleFixSequences = async () => {
        setFixingSeqs(true);
        clearMessages();
        try {
            const res = await fetch('/api/admin/db/fix-sequence', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({}),
            });
            const result = await res.json();
            if (!res.ok) {
                addMessage(`Fix sequences: ${result.error}`, 'error');
            }
            else {
                for (const msg of result.results) {
                    addMessage(msg, 'success');
                }
            }
        }
        catch (err: unknown) {
            addMessage(`Fix sequences failed: ${err instanceof Error ? err.message : String(err)}`,
                       'error');
        }
        setFixingSeqs(false);
    };
    
    // ========================= //
    //   R E N D E R              //
    // ========================= //
    const selectClassName = `px-3 py-2 rounded bg-slate-700 text-white border border-slate-500
                             focus:outline-none focus:ring-2 focus:ring-blue-500`;
    const btnClassName    = `px-4 py-2 rounded text-white font-medium shadow
                             disabled:opacity-50 disabled:cursor-not-allowed`;
    const btnBlue         = `${btnClassName} bg-blue-600 hover:bg-blue-700`;
    const btnGreen        = `${btnClassName} bg-green-600 hover:bg-green-700`;
    const btnAmber        = `${btnClassName} bg-amber-600 hover:bg-amber-700`;
    
    return (
        <div className="flex flex-col text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Section */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-600">
              <h3 className="text-lg font-semibold mb-4">Export</h3>
              
              <div className="flex items-center gap-3 mb-4">
                <select className={selectClassName}
                        value   ={exportModel}
                        onChange={(e) => setExportModel(e.target.value as ModelName)}
                >
                  {MODEL_NAMES.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <button className={btnBlue}
                        disabled ={exporting || exportingAll}
                        onClick  ={handleExportSingle}
                >
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
              
              <button className={btnGreen}
                      disabled ={exporting || exportingAll}
                      onClick  ={handleExportAll}
              >
                {exportingAll ? 'Exporting All...' : 'Export All Models'}
              </button>
            </div>
            
            {/* Import Section */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-600">
              <h3 className="text-lg font-semibold mb-4">Import</h3>
              
              {/* Single model import */}
              <div className="flex items-center gap-3 mb-3">
                <select className={selectClassName}
                        value    ={importModel}
                        onChange ={(e) => setImportModel(e.target.value as ModelName)}
                >
                  {MODEL_NAMES.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <input ref      ={fileInputRef}
                       type     ="file"
                       accept   =".csv"
                       className="text-sm text-gray-300 file:mr-2 file:py-1 file:px-3
                                  file:rounded file:border-0 file:text-sm file:font-medium
                                  file:bg-slate-600 file:text-white hover:file:bg-slate-500"
                />
              </div>
              <button className={`${btnBlue} mb-4`}
                      disabled ={importing || importingAll}
                      onClick  ={handleImportSingle}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
              
              {/* Import All */}
              <div className="border-t border-slate-600 pt-4">
                <p className="text-sm text-gray-400 mb-2">
                  Select multiple CSV files named <code>export-ModelName.csv</code>.
                  They will be imported in FK-safe order.
                </p>
                <input ref      ={allFilesRef}
                       type     ="file"
                       accept   =".csv"
                       multiple
                       className="text-sm text-gray-300 mb-3 file:mr-2 file:py-1 file:px-3
                                  file:rounded file:border-0 file:text-sm file:font-medium
                                  file:bg-slate-600 file:text-white hover:file:bg-slate-500"
                />
                <div className="flex gap-3">
                  <button className={btnGreen}
                          disabled ={importing || importingAll}
                          onClick  ={handleImportAll}
                  >
                    {importingAll ? 'Importing All...' : 'Import All'}
                  </button>
                  <button className={btnAmber}
                          disabled ={fixingSeqs}
                          onClick  ={handleFixSequences}
                  >
                    {fixingSeqs ? 'Fixing...' : 'Fix Sequences'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Status Messages */}
          {messages.length > 0 && (
            <div className="mt-4 bg-slate-800 rounded-xl p-4 border border-slate-600
                            max-h-[30vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-300">Status</h4>
                <button className="text-xs text-gray-400 hover:text-white"
                        onClick  ={clearMessages}
                >
                  Clear
                </button>
              </div>
              {messages.map((msg, i) => (
                <p key={i}
                   className={`text-sm ${msg.type === 'success' ? 'text-green-400' :
                                         msg.type === 'error'   ? 'text-red-400'   :
                                         'text-gray-400'}`}
                >
                  {msg.text}
                </p>
              ))}
            </div>
          )}
        </div>
    );
};

export default ImportExportTab;
