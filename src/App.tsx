import React, { useState, useEffect } from 'react';
import { FolderOpen, User, Lock, Save, X } from 'lucide-react';

function App() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    user_folder: '',
    write_permission: 'no'
  });

  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | null;
  }>({
    message: '',
    type: null
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folders, setFolders] = useState<Array<{ name: string; path: string }>>([]);
  const [currentPath, setCurrentPath] = useState('/mnt/stgw/SFTP');

  const loadFolders = async (path: string) => {
    try {
      const response = await fetch(`/api/list-folders?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      
      if (response.ok) {
        setFolders(data.folders);
        setCurrentPath(data.current_path);
      } else {
        setStatus({
          message: data.error || 'Erro ao carregar pastas',
          type: 'error'
        });
      }
    } catch (error) {
      setStatus({
        message: 'Erro ao conectar com o servidor',
        type: 'error'
      });
    }
  };

  const handleFolderSelect = (path: string) => {
    setFormData(prev => ({ ...prev, user_folder: path }));
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ message: '', type: null });

    try {
      const response = await fetch('/api/create_user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          message: data.message || 'Usuário FTP criado com sucesso!',
          type: 'success'
        });
        setFormData({
          username: '',
          password: '',
          user_folder: '',
          write_permission: 'no'
        });
      } else {
        setStatus({
          message: data.error || 'Falha ao criar usuário FTP',
          type: 'error'
        });
      }
    } catch (error) {
      setStatus({
        message: 'Falha ao conectar com o servidor',
        type: 'error'
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  useEffect(() => {
    if (isModalOpen) {
      loadFolders(currentPath);
    }
  }, [isModalOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Criar Usuário FTP</h1>
          <p className="text-gray-600">Digite os dados para a nova conta FTP</p>
        </div>

        {status.message && (
          <div className={`mb-6 p-4 rounded-lg ${
            status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Nome de usuário"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Senha"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FolderOpen className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              name="user_folder"
              value={formData.user_folder}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="/mnt/stgw/SFTP/..."
              required
              readOnly
            />
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="absolute inset-y-0 right-0 px-3 flex items-center bg-gray-50 rounded-r-lg hover:bg-gray-100"
            >
              Selecionar
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissão de escrita
            </label>
            <select
              name="write_permission"
              value={formData.write_permission}
              onChange={handleChange}
              className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="no">Não</option>
              <option value="yes">Sim</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            <Save className="h-5 w-5" />
            Criar Usuário
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Todos os campos são obrigatórios para criar um novo usuário FTP
        </div>
      </div>

      {/* Modal de Seleção de Pasta */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Selecionar Pasta</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Caminho atual: {currentPath}
                </p>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {folders.map((folder) => (
                  <button
                    key={folder.path}
                    onClick={() => handleFolderSelect(folder.path)}
                    className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center gap-2"
                  >
                    <FolderOpen className="h-5 w-5 text-gray-400" />
                    {folder.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;