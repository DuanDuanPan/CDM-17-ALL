'use client';

/**
 * Story 2.1: Property Panel Registry
 * Registry pattern mapping NodeType → Form Component
 * Story 2.9: Added APP node form registration
 */

import { NodeType } from '@cdm/types';
import type { ComponentType } from 'react';
import { OrdinaryForm, type OrdinaryFormProps } from './OrdinaryForm';
import { TaskForm, type TaskFormProps } from './TaskForm';
import { RequirementForm, type RequirementFormProps } from './RequirementForm';
import { PBSForm, type PBSFormProps } from './PBSForm';
import { DataForm, type DataFormProps } from './DataForm';
import { AppForm, type AppFormProps } from '@/components/App';

// Union type for all form props
export type PropertyFormProps =
  | OrdinaryFormProps
  | TaskFormProps
  | RequirementFormProps
  | PBSFormProps
  | DataFormProps
  | AppFormProps;

// Registry mapping NodeType to Form Component
export const PropertyFormRegistry: Record<NodeType, ComponentType<any>> = {
  [NodeType.ORDINARY]: OrdinaryForm,
  [NodeType.TASK]: TaskForm,
  [NodeType.REQUIREMENT]: RequirementForm,
  [NodeType.PBS]: PBSForm,
  [NodeType.DATA]: DataForm,
  [NodeType.APP]: AppForm, // Story 2.9
};

/**
 * Get the form component for a given node type
 */
export function getFormComponent(nodeType: NodeType): ComponentType<any> {
  return PropertyFormRegistry[nodeType] || OrdinaryForm;
}
