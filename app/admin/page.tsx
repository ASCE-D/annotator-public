'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Save, Trash2, Edit, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import AddProductForm from '@/components/AddProduct';
import { Badge } from '@/components/ui/badge';

// Import the server action to get teams
import { getTeams } from '@/app/actions/team';

interface Team {
  _id: string;
  name: string;
  description?: string;
  createdBy: {
    name: string;
    email: string;
  };
}

interface CustomField {
  _id?: string;
  name: string;
  label: string;
  type: 'text' | 'link' | 'file' | 'array';
  isRequired: boolean;
  acceptedFileTypes: string | null;
  isActive: boolean;
  teams: string[];
}

const CustomFieldsPage = () => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  
  // For edit modal
  const [editField, setEditField] = useState<CustomField | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // For delete confirmation
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchCustomFields();
    fetchTeams();
  }, []);
  
  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/custom-fields');
      if (!response.ok) throw new Error('Failed to fetch custom fields');
      const data = await response.json();
      setCustomFields(data);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      toast.error('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      setTeamsLoading(true);
      const teamsData = await getTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleAddField = () => {
    // Set first team as default if available
    const defaultTeams = teams.length > 0 ? [teams[0]._id] : [];
    
    // Create a new field template
    const newField: CustomField = {
      name: '',
      label: '',
      type: 'text',
      isRequired: false,
      acceptedFileTypes: null,
      isActive: true,
      teams: defaultTeams,
    };
    
    // Open edit modal with the new field
    setEditField(newField);
    setEditIndex(null); // null means we're adding a new field
    setIsEditModalOpen(true);
  };

  const handleEditField = (field: CustomField, index: number) => {
    setEditField({...field}); // Create a copy to avoid direct state mutation
    setEditIndex(index);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteField = (fieldId?: string) => {
    if (!fieldId) {
      toast.error('Cannot delete field without ID');
      return;
    }
    
    setDeleteFieldId(fieldId);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteField = async () => {
    if (!deleteFieldId) return;
    
    try {
      const response = await fetch(`/api/admin/custom-fields/${deleteFieldId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete custom field');
      }
      
      // Remove the field from state after successful deletion
      setCustomFields(customFields.filter(field => field._id !== deleteFieldId));
      toast.success('Custom field deleted successfully');
    } catch (error) {
      console.error('Error deleting custom field:', error);
      toast.error(`Failed to delete custom field: ${(error as Error).message}`);
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteFieldId(null);
    }
  };

  const handleEditFieldChange = (field: keyof CustomField, value: any) => {
    if (!editField) return;
    
    setEditField({
      ...editField,
      [field]: value
    });
  };
  
  const handleTeamSelection = (teamId: string) => {
    if (!editField) return;
    
    const currentTeams = [...(editField.teams || [])];
    const teamIndex = currentTeams.indexOf(teamId);
    
    if (teamIndex === -1) {
      // Add team if not already selected
      currentTeams.push(teamId);
    } else {
      // Remove team if already selected
      currentTeams.splice(teamIndex, 1);
    }
    
    setEditField({
      ...editField,
      teams: currentTeams
    });
  };

  const handleSelectAllTeams = (selectAll: boolean) => {
    if (!editField) return;
    
    setEditField({
      ...editField,
      teams: selectAll ? teams.map(team => team._id) : []
    });
  };

  const validateField = (field: CustomField) => {
    if (!field.name || !field.label) {
      toast.error('Field must have a name and label');
      return false;
    }
    
    if (field.type === 'file' && !field.acceptedFileTypes) {
      toast.error('File fields must have accepted file types specified');
      return false;
    }
    
    // Ensure at least one team is selected
    if (!field.teams || field.teams.length === 0) {
      toast.error('Field must be assigned to at least one team');
      return false;
    }
    
    return true;
  };

  const saveField = async () => {
    if (!editField || !validateField(editField)) return;
    
    try {
      let response;
      
      if (editField._id) {
        // Update existing field
        response = await fetch(`/api/admin/custom-fields/${editField._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: editField }),
        });
      } else {
        // Create new field
        response = await fetch('/api/admin/custom-fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: editField }),
        });
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save custom field');
      }
      
      const savedField = await response.json();
      
      if (editIndex !== null) {
        // Update existing field in state
        const updatedFields = [...customFields];
        updatedFields[editIndex] = savedField;
        setCustomFields(updatedFields);
      } else {
        // Add new field to state
        setCustomFields([...customFields, savedField]);
      }
      
      toast.success(`Custom field ${editField._id ? 'updated' : 'created'} successfully`);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error saving custom field:', error);
      toast.error(`Failed to save custom field: ${(error as Error).message}`);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading custom fields...</div>;
  }

  return (
    <>
      <div className='flex justify-between items-center mb-8'>
        <div className='flex gap-4'>
          <Button
            onClick={() => setIsAddProductModalOpen(true)}
            variant='outline'
            className='flex items-center gap-2'
          >
            Add products
          </Button>
          <Button
            onClick={handleAddField}
            variant='outline'
            className='flex items-center gap-2'
          >
            <PlusCircle className='w-4 h-4' />
            Add Field
          </Button>
        </div>
      </div>

      <div className='space-y-6'>
        {customFields.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium">No custom fields</h3>
                <p className="mt-1 text-gray-500">Get started by creating a new custom field.</p>
                <Button onClick={handleAddField} className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          customFields.map((field, index) => (
            <Card key={field._id || index}>
              <CardHeader>
                <CardTitle className='flex justify-between items-center'>
                  <span>{field.label || `Field #${index + 1}`}</span>
                  <div className="flex space-x-2">
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleEditField(field, index)}
                    >
                      <Edit className='w-4 h-4 text-blue-500' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleDeleteField(field._id)}
                    >
                      <Trash2 className='w-4 h-4 text-red-500' />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <Label className="font-medium">Name:</Label>
                    <div className="mt-1">{field.name}</div>
                  </div>
                  
                  <div>
                    <Label className="font-medium">Type:</Label>
                    <div className="mt-1 capitalize">{field.type}</div>
                  </div>
                  
                  {field.type === 'file' && (
                    <div>
                      <Label className="font-medium">Accepted File Types:</Label>
                      <div className="mt-1">{field.acceptedFileTypes || 'None specified'}</div>
                    </div>
                  )}
                  
                  <div>
                    <Label className="font-medium">Status:</Label>
                    <div className="mt-1">
                      <Badge className={field.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {field.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label className="font-medium">Teams:</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {field.teams?.length === teams.length ? (
                        <Badge className="bg-blue-100 text-blue-800">All Teams</Badge>
                      ) : (
                        field.teams?.map(teamId => {
                          const team = teams.find(t => t._id === teamId);
                          return team ? (
                            <Badge key={teamId} className="bg-blue-100 text-blue-800">
                              {team.name}
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit/Add Field Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editField?._id ? 'Edit Field' : 'Add New Field'}</DialogTitle>
            <DialogDescription>
              {editField?._id ? 'Make changes to your field below.' : 'Fill in the details for your new custom field.'}
            </DialogDescription>
          </DialogHeader>
          
          {editField && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Field Name
                </Label>
                <Input
                  id="name"
                  value={editField.name}
                  onChange={(e) => handleEditFieldChange('name', e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., githubProfile"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="label" className="text-right">
                  Display Label
                </Label>
                <Input
                  id="label"
                  value={editField.label}
                  onChange={(e) => handleEditFieldChange('label', e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., GitHub Profile"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Field Type
                </Label>
                <Select
                  value={editField.type}
                  onValueChange={(value: any) => handleEditFieldChange('type', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="file">File Upload</SelectItem>
                    <SelectItem value="array">Array (comma-separated)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {editField.type === 'file' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="acceptedFileTypes" className="text-right">
                    File Types
                  </Label>
                  <Input
                    id="acceptedFileTypes"
                    value={editField.acceptedFileTypes || ''}
                    onChange={(e) => handleEditFieldChange('acceptedFileTypes', e.target.value)}
                    className="col-span-3"
                    placeholder=".pdf,.doc,.docx"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">
                  Active
                </Label>
                <div className="col-span-3 flex items-center">
                  <Switch
                    id="isActive"
                    checked={editField.isActive}
                    onCheckedChange={(checked) => handleEditFieldChange('isActive', checked)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Teams</Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-teams"
                      checked={editField.teams?.length === teams.length}
                      onCheckedChange={(checked) => handleSelectAllTeams(!!checked)}
                    />
                    <Label htmlFor="select-all-teams">Select All Teams</Label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {teams.map((team) => (
                      <div key={team._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`team-${team._id}`}
                          checked={editField.teams?.includes(team._id) || false}
                          onCheckedChange={(checked) => 
                            checked !== 'indeterminate' && handleTeamSelection(team._id)
                          }
                        />
                        <Label htmlFor={`team-${team._id}`}>{team.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={saveField}>
              {editField?._id ? 'Save Changes' : 'Create Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              custom field and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteField} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isAddProductModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-6 rounded-lg max-w-md w-full'>
            <AddProductForm onClose={() => setIsAddProductModalOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default CustomFieldsPage;