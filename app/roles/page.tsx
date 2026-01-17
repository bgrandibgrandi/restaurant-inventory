'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PERMISSION_GROUPS } from '@/lib/permissions';

interface Role {
  id: string;
  name: string;
  permissions: string;
  isSystemRole: boolean;
  _count?: {
    users: number;
  };
  createdAt: string;
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[],
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a role name');
      return;
    }

    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', permissions: [] });
        await fetchRoles();
      } else {
        const errorData = await response.json();
        alert(`Failed to create role: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating role:', error);
      alert('An error occurred');
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    if (!formData.name.trim()) {
      alert('Please enter a role name');
      return;
    }

    try {
      const response = await fetch(`/api/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setEditingRole(null);
        setFormData({ name: '', permissions: [] });
        await fetchRoles();
      } else {
        const errorData = await response.json();
        alert(`Failed to update role: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('An error occurred');
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      permissions: JSON.parse(role.permissions),
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRoles(roles.filter((role) => role.id !== id));
        setDeleteConfirm(null);
      } else {
        const errorData = await response.json();
        alert(`Failed to delete role: ${errorData.error || 'Unknown error'}`);
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('An error occurred');
      setDeleteConfirm(null);
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const selectAllInGroup = (groupPermissions: string[]) => {
    const allSelected = groupPermissions.every((p) => formData.permissions.includes(p));
    if (allSelected) {
      // Deselect all in group
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => !groupPermissions.includes(p)),
      }));
    } else {
      // Select all in group
      const newPermissions = [...formData.permissions];
      groupPermissions.forEach((p) => {
        if (!newPermissions.includes(p)) {
          newPermissions.push(p);
        }
      });
      setFormData((prev) => ({ ...prev, permissions: newPermissions }));
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
              <Link href="/users" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Users
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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-gray-600 mt-1">Create custom roles with specific permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
          >
            Create Role
          </button>
        </div>

        {/* Roles List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">All Roles ({roles.length})</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading roles...</div>
          ) : roles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <p className="text-gray-600">No roles yet</p>
              <p className="text-sm text-gray-500 mt-1">Create your first custom role</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {roles.map((role) => {
                const permissions = JSON.parse(role.permissions);
                return (
                  <div key={role.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                          {role.isSystemRole && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                              System Role
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            {role._count?.users || 0} {role._count?.users === 1 ? 'user' : 'users'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {permissions.length === 0 ? (
                            <span className="text-sm text-gray-500">No permissions</span>
                          ) : (
                            permissions.map((permission: string) => (
                              <span
                                key={permission}
                                className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700"
                              >
                                {permission.replace(':', ' ')}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(role)}
                          disabled={role.isSystemRole}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(role.id)}
                          disabled={role.isSystemRole}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Role Modal */}
      {(showCreateModal || editingRole) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full my-8">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h3>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Role Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Kitchen Manager, Cashier"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupPermissions = group.permissions.map((p) => p.key);
                    const allSelected = groupPermissions.every((p) => formData.permissions.includes(p));
                    const someSelected = groupPermissions.some((p) => formData.permissions.includes(p));

                    return (
                      <div key={group.name} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">{group.name}</h4>
                          <button
                            onClick={() => selectAllInGroup(groupPermissions)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="space-y-2">
                          {group.permissions.map((permission) => (
                            <label
                              key={permission.key}
                              className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(permission.key)}
                                onChange={() => togglePermission(permission.key)}
                                className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{permission.label}</div>
                                <div className="text-xs text-gray-500">{permission.description}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRole(null);
                  setFormData({ name: '', permissions: [] });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={editingRole ? handleUpdateRole : handleCreateRole}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
              >
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Role?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. Users with this role will need to be reassigned.
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
