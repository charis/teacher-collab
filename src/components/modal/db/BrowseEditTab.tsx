// Library imports
import { useState, useEffect, useCallback } from 'react';
// Custom imports
import { MODEL_NAMES,
         MODEL_META,
         ModelName,
         FieldDef 
       } from '@/util/ModelRegistry';

/**
 * Shape of the JSON payload returned by {@code GET /api/admin/db/records}.
 */
type RecordsResponse = {
    /** The page of records */
    records : Record<string, unknown>[];
    /** Total number of records across all pages */
    total   : number;
    /** Current page number (1-based) */
    page    : number;
    /** Number of records per page */
    pageSize: number;
};

/** Number of records shown per page. */
const PAGE_SIZE = 25;

/**
 * Tab content for the "Browse & Edit" panel inside {@link DatabaseModal}.
 *
 * Displays a paginated data table for the selected Prisma model with:
 * - **Inline editing** — click "Edit" on a row to modify non-read-only fields
 * - **Record creation** — "Add Record" inserts a blank row at the top
 * - **Deletion with confirmation** — "Delete" asks for confirmation before
 *   sending the request
 * - **Pagination** — Previous / Next controls when the total exceeds
 *   {@link PAGE_SIZE}
 *
 * Columns and input types are auto-generated from the model's
 * {@link FieldDef} array in {@link MODEL_META}.
 */
const BrowseEditTab: React.FC = () => {
    const [selectedModel, setSelectedModel] = useState<ModelName>('User');
    const [records,       setRecords]       = useState<Record<string, unknown>[]>([]);
    const [total,         setTotal]         = useState(0);
    const [page,          setPage]          = useState(1);
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState<string | null>(null);
    
    // Editing state
    const [editingIdx,    setEditingIdx]    = useState<number | null>(null);
    const [editData,      setEditData]      = useState<Record<string, unknown>>({});
    
    // New record state
    const [adding,        setAdding]        = useState(false);
    const [newData,       setNewData]       = useState<Record<string, unknown>>({});
    
    // Delete confirmation
    const [deletingIdx,   setDeletingIdx]   = useState<number | null>(null);
    
    const meta       = MODEL_META[selectedModel];
    const fields     = meta.fields;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    
    // ====================================================================== //
    //                               F E T C H                                //
    // ====================================================================== //
    /**
     * Fetches a page of records for the currently selected model from the
     * API and updates the table state. Re-created whenever
     * {@link selectedModel} or {@link page} changes.
     */
    const fetchRecords = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/admin/db/records?model=${selectedModel}&page=${page}&pageSize=${PAGE_SIZE}`
            );
            if (!res.ok) {
                const err = await res.json();
                setError(err.error);
                return;
            }
            const data: RecordsResponse = await res.json();
            setRecords(data.records);
            setTotal(data.total);
        }
        catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setLoading(false);
        }
    }, [selectedModel, page]);
    
    /** Reset pagination and editing state when the user switches models. */
    useEffect(() => {
        setPage(1);
        setEditingIdx(null);
        setAdding(false);
        setDeletingIdx(null);
    }, [selectedModel]);

    /** Fetch records whenever the model, page, or fetchRecords reference changes. */
    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);
    
    // ====================================================================== //
    //                                E D I T                                 //
    // ====================================================================== //
    /**
     * Enters edit mode for the row at the given index, copying its current
     * values into the edit buffer.
     *
     * @param idx - Zero-based row index within the current page
     */
    const startEdit = (idx: number) => {
        setEditingIdx(idx);
        setEditData({ ...records[idx] });
        setAdding(false);
        setDeletingIdx(null);
    };
    
    /** Exits edit mode and discards unsaved changes. */
    const cancelEdit = () => {
        setEditingIdx(null);
        setEditData({});
    };
    
    /**
     * Sends the changed fields for the currently edited row to the update API.
     * Only fields that differ from the original record are included. Exits
     * edit mode and refreshes the table on success.
     */
    const saveEdit = async () => {
        if (editingIdx === null) {
            return;
        }
        
        const record = records[editingIdx];
        const key    = buildKey(record);
        
        // Build update data (only non-readOnly, non-PK fields)
        const updateData: Record<string, unknown> = {};
        for (const field of fields) {
            if (field.readOnly) continue;
            if (isPrimaryKeyField(field.name)) continue;
            if (editData[field.name] !== record[field.name]) {
                updateData[field.name] = coerceValue(field, editData[field.name]);
            }
        }
        
        if (Object.keys(updateData).length === 0) {
            cancelEdit();
            return;
        }
        
        try {
            const res = await fetch('/api/admin/db/record', {
                method : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ model: selectedModel, key, data: updateData }),
            });
            if (!res.ok) {
                const err = await res.json();
                setError(err.error);
                return;
            }
            cancelEdit();
            fetchRecords();
        }
        catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };
    
    // ====================================================================== //
    //                              C R E A T E                               //
    // ====================================================================== //
    /**
     * Enters creation mode, showing a blank row at the top of the table with
     * default values for each editable field.
     */
    const startAdd = () => {
        setAdding(true);
        setEditingIdx(null);
        setDeletingIdx(null);
        
        const defaults: Record<string, unknown> = {};
        for (const f of fields) {
            if (f.readOnly) continue;
            if (f.type === 'boolean')     defaults[f.name] = false;
            else if (f.type === 'number') defaults[f.name] = '';
            else                          defaults[f.name] = '';
        }
        setNewData(defaults);
    };
    
    /** Exits creation mode and discards the new-record form data. */
    const cancelAdd = () => {
        setAdding(false);
        setNewData({});
    };
    
    /**
     * Sends the new-record form data to the create API. Empty strings in
     * nullable fields are converted to {@code null}. Exits creation mode
     * and refreshes the table on success.
     */
    const saveNew = async () => {
        const createData: Record<string, unknown> = {};
        for (const field of fields) {
            if (field.readOnly) continue;
            const val = newData[field.name];
            if (val === '' && field.nullable) {
                createData[field.name] = null;
            }
            else {
                createData[field.name] = coerceValue(field, val);
            }
        }
        
        try {
            const res = await fetch('/api/admin/db/record', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ model: selectedModel, data: createData }),
            });
            if (!res.ok) {
                const err = await res.json();
                setError(err.error);
                return;
            }
            cancelAdd();
            fetchRecords();
        }
        catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };
    
    // ====================================================================== //
    //                              D E L E T E                               //
    // ====================================================================== //
    /**
     * Deletes the record at the given row index after the user has confirmed.
     * Refreshes the table on success.
     *
     * @param idx - Zero-based row index within the current page
     */
    const confirmDelete = async (idx: number) => {
        const record = records[idx];
        const key    = buildKey(record);
        
        try {
            const res = await fetch('/api/admin/db/record', {
                method : 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ model: selectedModel, key }),
            });
            if (!res.ok) {
                const err = await res.json();
                setError(err.error);
                return;
            }
            setDeletingIdx(null);
            fetchRecords();
        }
        catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };
    
    // ====================================================================== //
    //                              H E L P E R                               //
    // ====================================================================== //
    /**
     * Returns {@code true} if the field is part of the model's primary key.
     *
     * @param fieldName - The field name to check
     *
     * @returns Whether the field is a primary-key column
     */
    function isPrimaryKeyField(fieldName: string): boolean {
        return Array.isArray(meta.primaryKey)
            ? meta.primaryKey.includes(fieldName)
            : meta.primaryKey === fieldName;
    }
    
    /**
     * Extracts the primary-key fields from a record to build the
     * {@code where} clause for update/delete API calls.
     *
     * @param record - A full record from the current page
     *
     * @returns An object containing only the primary-key field(s) and their
     *          values
     */
    function buildKey(record: Record<string, unknown>): Record<string, unknown> {
        const key: Record<string, unknown> = {};
        if (Array.isArray(meta.primaryKey)) {
            for (const k of meta.primaryKey) key[k] = record[k];
        } else {
            key[meta.primaryKey] = record[meta.primaryKey];
        }
        return key;
    }
    
    /**
     * Converts a raw form value to the type expected by the API, based on
     * the field definition.
     *
     * @param field - The field metadata (type, nullable)
     * @param val   - The raw value from the input control
     *
     * @returns The coerced value ready for the API payload
     */
    function coerceValue(field: FieldDef, val: unknown): unknown {
        if (val === null || val === '' || val === undefined) {
            return field.nullable ? null : val;
        }
        switch (field.type) {
            case 'number':
                 return Number(val);
            
            case 'boolean':
                 return val === true || val === 'true';
            
            case 'date':
                 return new Date(String(val)).toISOString();
            
            default:
                 return String(val);
        }
    }
    
    /**
     * Formats a record value for display in a table cell. Dates are
     * locale-formatted, booleans shown as {@code "true"}/{@code "false"},
     * and long strings are truncated with an ellipsis.
     *
     * @param field - The field metadata
     * @param value - The raw value from the record
     *
     * @returns A human-readable string for the cell (or {@code "—"} for null)
     */
    /** Max display lengths for specific fields. */
    const fieldMaxLengths: Record<string, number> = {
        id                          : 4,
        email                       : 35,
        name                        : 30,
        password                    : 10,
        forgotPasswordToken         : 10,
        forgotPasswordTokenExpiry   : 10,
        verifyToken                 : 10,
        verifyTokenExpiry           : 10,
    };

    function formatCell(field: FieldDef, value: unknown): string {
        if (value === null || value === undefined) return '—';
        if (field.type === 'date' && value) {
            try {
              return new Date(String(value)).toLocaleString();
            }
            catch {
              return String(value);
            }
        }
        if (field.type === 'boolean') {
          return value ? 'true' : 'false';
        }
        if (field.type === 'json') {
            const s = typeof value === 'string' ? value : JSON.stringify(value);
            return s.length > 60 ? s.slice(0, 60) + '...' : s;
        }
        const s = String(value);
        const maxLen = fieldMaxLengths[field.name];
        if (maxLen && s.length > maxLen) {
            return s.slice(0, maxLen - 3) + '...';
        }
        return s.length > 80 ? s.slice(0, 80) + '...' : s;
    }
    
    // ====================================================================== //
    //                              R E N D E R                               //
    // ====================================================================== //
    const selectClassName = `px-3 py-2 rounded bg-slate-700 text-white border border-slate-500
                             focus:outline-none focus:ring-2 focus:ring-blue-500`;
    const btnSmall        = `px-2 py-1 text-xs rounded font-medium`;
    
    return (
        <div className="flex flex-col h-full text-white">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select className={selectClassName}
                    value   ={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as ModelName)}
            >
              {MODEL_NAMES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            
            <button className={`${btnSmall} bg-green-600 hover:bg-green-700 text-white`}
                    onClick={startAdd}
            >
              + Add Record
            </button>
            
            <button className={`${btnSmall} bg-slate-600 hover:bg-slate-500 text-white`}
                    onClick={fetchRecords}
            >
              Refresh
            </button>
            
            <span className="text-sm text-gray-400 ml-auto">
              {total} record{total !== 1 ? 's' : ''}
              {totalPages > 1 && ` — Page ${page} of ${totalPages}`}
            </span>
          </div>
          
          {/* Error */}
          {error && (
            <div className="mb-3 p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
              {error}
              <button className="ml-3 text-red-400 hover:text-white underline"
                      onClick={() => setError(null)}
              >
                dismiss
              </button>
            </div>
          )}
          
          {/* Table */}
          <div className="flex-1 overflow-auto border border-slate-600 rounded">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                Loading...
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-700 sticky top-0">
                  <tr>
                    {fields.map((f) => (
                      <th key={f.name}
                          className="px-3 py-2 text-left text-gray-300 font-medium
                                     whitespace-nowrap border-b border-slate-600"
                      >
                        {f.name}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left text-gray-300 font-medium
                                   border-b border-slate-600 w-[120px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* New record row */}
                  {adding && (
                    <tr className="bg-green-900/20 border-b border-slate-600">
                      {fields.map((field) => (
                        <td key={field.name} className="px-3 py-1">
                          {field.readOnly ? (
                            <span className="text-gray-500 text-xs">auto</span>
                          ) : (
                            <FieldInput field={field}
                                        value={newData[field.name]}
                                        onChange={(val) =>
                                          setNewData(prev => ({ ...prev, [field.name]: val }))
                                        }
                            />
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-1 space-x-1">
                        <button className={`${btnSmall} bg-green-600 hover:bg-green-700 text-white`}
                                onClick={saveNew}
                        >
                          Save
                        </button>
                        <button className={`${btnSmall} bg-gray-600 hover:bg-gray-500 text-white`}
                                onClick={cancelAdd}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  )}
                  
                  {/* Data rows */}
                  {records.map((record, idx) => (
                    <tr key={idx}
                        className={`border-b border-slate-700 hover:bg-slate-700/30
                                    ${editingIdx  === idx ? 'bg-blue-900/20' : ''}
                                    ${deletingIdx === idx ? 'bg-red-900/20' : ''}`}
                    >
                      {fields.map((field) => (
                        <td key={field.name} className="px-3 py-1">
                          {editingIdx === idx && !field.readOnly && !isPrimaryKeyField(field.name) ?
                          (
                            <FieldInput field={field}
                                        value={editData[field.name]}
                                        onChange={(val) =>
                                          setEditData(prev => ({ ...prev, [field.name]: val }))
                                        }
                            />
                          ) : (
                            <span className="text-gray-200 whitespace-nowrap"
                                  title={String(record[field.name] ?? '')}
                            >
                              {formatCell(field, record[field.name])}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-1 space-x-1 whitespace-nowrap">
                        {editingIdx === idx ? (
                          <>
                            <button className={`${btnSmall} bg-blue-600 hover:bg-blue-700 text-white`}
                                    onClick  ={saveEdit}
                            >
                              Save
                            </button>
                            <button className={`${btnSmall}
                                                bg-gray-600 hover:bg-gray-500 text-white`}
                                    onClick  ={cancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : deletingIdx === idx ? (
                          <>
                            <span className="text-red-400 text-xs mr-1">Delete?</span>
                            <button className={`${btnSmall} bg-red-600 hover:bg-red-700 text-white`}
                                    onClick  ={() => confirmDelete(idx)}
                            >
                              Yes
                            </button>
                            <button className={`${btnSmall}
                                                bg-gray-600 hover:bg-gray-500 text-white`}
                                    onClick  ={() => setDeletingIdx(null)}
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button className={`${btnSmall}
                                                bg-slate-600 hover:bg-slate-500 text-white`}
                                    onClick  ={() => startEdit(idx)}
                            >
                              Edit
                            </button>
                            <button className={`${btnSmall} bg-red-700 hover:bg-red-600 text-white`}
                                    onClick  ={() => { setDeletingIdx(idx); setEditingIdx(null); }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  {records.length === 0 && !loading && (
                    <tr>
                      <td colSpan  ={fields.length + 1}
                          className="px-3 py-8 text-center text-gray-500"
                      >
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <button className={`${btnSmall} bg-slate-600 hover:bg-slate-500 text-white`}
                      disabled ={page <= 1}
                      onClick  ={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button className={`${btnSmall} bg-slate-600 hover:bg-slate-500 text-white`}
                      disabled ={page >= totalPages}
                      onClick  ={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
    );
};

// ========================================================================== //
//                           F I E L D   I N P U T                            //
// ========================================================================== //
/**
 * Props for {@link FieldInput}
 */
type FieldInputProps = {
    /** The field metadata that determines which input type to render */
    field   : FieldDef;
    /** The current value of the field */
    value   : unknown;
    /** Called with the new value whenever the user changes the input */
    onChange : (val: unknown) => void;
};

/**
 * Renders the appropriate input control for a single table cell based on
 * the field's type:
 * - {@code boolean} — checkbox
 * - {@code number} — numeric input
 * - {@code date} — datetime-local picker
 * - {@code string} (long fields) — textarea
 * - {@code string} (short fields) — text input
 */
const FieldInput: React.FC<FieldInputProps> = ({ field, value, onChange }) => {
    const inputClassName = `w-full px-2 py-1 text-sm rounded bg-slate-600 text-white
                            border border-slate-500 focus:outline-none focus:ring-1
                            focus:ring-blue-500`;
    
    if (field.type === 'boolean') {
        return (
            <input type    ="checkbox"
                   checked ={value === true || value === 'true'}
                   onChange={(e) => onChange(e.target.checked)}
                   className="accent-blue-500"
            />
        );
    }
    
    // Use textarea for potentially long string fields
    const longFields = ['text', 'description', 'instructions', 'initialMessage',
                        'agentNotes', 'imageDescription', 'global_instructions'];
    if (field.type === 'string' && longFields.includes(field.name)) {
        return (
            <textarea className={inputClassName}
                      rows    ={2}
                      value   ={value === null ? '' : String(value ?? '')}
                      onChange={(e) => onChange(e.target.value || null)}
            />
        );
    }
    
    if (field.type === 'number') {
        return (
            <input type     ="number"
                   className={inputClassName}
                   value    ={value === null ? '' : String(value ?? '')}
                   onChange ={(e) => onChange(e.target.value === '' ? null : e.target.value)}
            />
        );
    }
    
    if (field.type === 'date') {
        return (
            <input type     ="datetime-local"
                   className={inputClassName}
                   value    ={value ? String(value).slice(0, 16) : ''}
                   onChange ={(e) => onChange(e.target.value || null)}
            />
        );
    }
    
    // Default: text input
    return (
        <input type     ="text"
               className={inputClassName}
               value    ={value === null ? '' : String(value ?? '')}
               onChange ={(e) => onChange(e.target.value || null)}
        />
    );
};

export default BrowseEditTab;
