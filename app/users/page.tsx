'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
  permissions: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  roleId: string | null;
  role: Role | null;
  createdAt: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newUserData, setNewUserData] = useState({ email: '', name: '', roleId: '' });
  const [editUserData, setEditUserData] = useState({ name: '', roleId: '' });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleInviteUser = async () => {
    if (!newUserData.email.trim()) {
      alert('Please enter an email address');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData),
      });

      if (response.ok) {
        setNewUserData({ email: '', name: '', roleId: '' });
        await fetchUsers();
        alert('User invited successfully! They can now sign in with their Google account.');
      } else {
        const errorData = await response.json();
        alert(`Failed to invite user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('An error occurred');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditUserData({
      name: user.name || '',
      roleId: user.roleId || '',
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserData),
      });

      if (response.ok) {
        setEditingId(null);
        setEditUserData({ name: '', roleId: '' });
        await fetchUsers();
      } else {
        const errorData = await response.json();
        alert(`Failed to update user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('An error occurred');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditUserData({ name: '', roleId: '' });
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(users.filter((user) => user.id !== id));
        setDeleteConfirm(null);
      } else {
        const errorData = await response.json();
        alert(`Failed to delete user: ${errorData.error || 'Unknown error'}`);
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('An error occurred');
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Restaurant Inventory
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/roles" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Roles
              </Link>
              <Link href="/categories" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Categories
              </Link>
              <Link href="/stores" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Venues
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600 mt-1">Invite and manage your team members</p>
        </div>

        {/* Invite User */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="email"
              value={newUserData.email}
              onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
              placeholder="Email address"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={adding}
            />
            <input
              type="text"
              value={newUserData.name}
              onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
              placeholder="Name (optional)"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={adding}
            />
            <select
              value={newUserData.roleId}
              onChange={(e) => setNewUserData({ ...newUserData, roleId: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={adding}
            >
              <option value="">No Role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleInviteUser}
              disabled={adding}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {adding ? 'Inviting...' : 'Invite User'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Users will be able to sign in using their Google account with this email
          </p>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">All Users ({users.length})</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-600">No users yet</p>
              <p className="text-sm text-gray-500 mt-1">Invite your first team member above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className={editingId === user.id ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4">
                        {editingId === user.id ? (
                          <input
                            type="text"
                            value={editUserData.name}
                            onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                            className="px-3 py-1 border border-red-300 rounded text-sm"
                            placeholder="Name"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{user.name || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === user.id ? (
                          <select
                            value={editUserData.roleId}
                            onChange={(e) => setEditUserData({ ...editUserData, roleId: e.target.value })}
                            className="px-3 py-1 border border-red-300 rounded text-sm"
                          >
                            <option value="">No Role</option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            {user.role?.name || 'No Role'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingId === user.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(user.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete User?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. The user will lose access to the system.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
