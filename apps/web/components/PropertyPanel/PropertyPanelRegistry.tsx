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
export const PropertyFormRegistry: Record<NodeType, ComponentType<Record<string, unknown>>> = {
  [NodeType.ORDINARY]: OrdinaryForm as unknown as ComponentType<Record<string, unknown>>,
  [NodeType.TASK]: TaskForm as unknown as ComponentType<Record<string, unknown>>,
  [NodeType.REQUIREMENT]: RequirementForm as unknown as ComponentType<Record<string, unknown>>,
  [NodeType.PBS]: PBSForm as unknown as ComponentType<Record<string, unknown>>,
  [NodeType.DATA]: DataForm as unknown as ComponentType<Record<string, unknown>>,
  [NodeType.APP]: AppForm as unknown as ComponentType<Record<string, unknown>>, // Story 2.9
};

/**
 * Get the form component for a given node type
 */
export function getFormComponent(nodeType: NodeType): ComponentType<Record<string, unknown>> {
  return PropertyFormRegistry[nodeType] || (OrdinaryForm as unknown as ComponentType<Record<string, unknown>>);
}
