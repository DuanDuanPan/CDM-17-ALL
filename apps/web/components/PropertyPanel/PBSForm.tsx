'use client';

/**
 * Story 2.1: PBS Node Form (Original)
 * Story 2.7: Extended with Indicators and Product Library linking
 * Form for PBS (Product Breakdown Structure) properties
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Hash, Tag, User, Target, Plus, Trash2, Package, Link, ChevronDown, Sparkles } from 'lucide-react';
import { Button, Badge, useToast } from '@cdm/ui';
import { nanoid } from 'nanoid';
import type { DataAssetWithFolder, PBSProps, PBSIndicator, ProductReference } from '@cdm/types';
import { ProductSearchDialog } from '@/components/ProductLibrary';
import { LinkedAssetsSection } from './LinkedAssetsSection';
import { useDataLibraryBindingOptional } from '@/features/data-library/contexts';

type IndicatorPreset = {
  name: string;
  unit?: string;
  targetValue?: string;
  actualValue?: string;
};

// Story 2.7: Common satellite engineering indicator presets
const INDICATOR_PRESETS: IndicatorPreset[] = [
  { name: '质量 (Mass)', unit: 'kg' },
  { name: '功率 (Power)', unit: 'W' },
  { name: '体积 (Volume)', unit: 'm³' },
  { name: '寿命 (Lifetime)', unit: '年' },
  { name: '轨道高度 (Orbit Altitude)', unit: 'km' },
  { name: '轨道倾角 (Inclination)', unit: '°' },
  { name: '轨道周期 (Orbit Period)', unit: 'min' },
  { name: '地面分辨率 (Resolution)', unit: 'm' },
  { name: '幅宽 (Swath Width)', unit: 'km' },
  { name: '姿态指向精度 (Pointing)', unit: 'arcsec' },
  { name: '数据下行速率 (Downlink)', unit: 'Mbps' },
  { name: '有效载荷功耗 (Payload Power)', unit: 'W' },
  { name: '推进剂装载量 (Propellant)', unit: 'kg' },
  { name: '成本 (Cost)', unit: '万元' },
  { name: '可靠性 (Reliability)', unit: '%' },
  { name: '寿命 (Lifetime)', unit: '年' },
  { name: '精度 (Accuracy)', unit: '' },
  { name: '效率 (Efficiency)', unit: '%' },
];

// Story 2.7 Extended: Satellite-specific indicator templates
const INDICATOR_TEMPLATES: Array<{
  id: string;
  label: string;
  indicators: IndicatorPreset[];
}> = [
    {
      id: 'communication',
      label: '通信卫星',
      indicators: [
        { name: '带宽 (Bandwidth)', unit: 'MHz' },
        { name: '转发器数量 (Transponders)', unit: '个' },
        { name: 'EIRP', unit: 'dBW' },
        { name: '覆盖范围 (Coverage)', unit: '°' },
        { name: '在轨寿命 (Lifetime)', unit: '年' },
      ],
    },
    {
      id: 'earthObservation',
      label: '对地观测卫星',
      indicators: [
        { name: '空间分辨率 (Resolution)', unit: 'm' },
        { name: '幅宽 (Swath Width)', unit: 'km' },
        { name: '重访周期 (Revisit)', unit: '天' },
        { name: '光谱波段 (Bands)', unit: '个' },
        { name: '数据传输率 (Data Rate)', unit: 'Mbps' },
      ],
    },
    {
      id: 'navigation',
      label: '导航卫星',
      indicators: [
        { name: '定位精度 (Position Accuracy)', unit: 'm' },
        { name: '授时精度 (Timing Accuracy)', unit: 'ns' },
        { name: '原子钟稳定度 (Clock Stability)', unit: '' },
        { name: '信号功率 (Signal Power)', unit: 'dBW' },
        { name: '星座规模 (Constellation)', unit: '颗' },
      ],
    },
    {
      id: 'scientific',
      label: '科学探测卫星',
      indicators: [
        { name: '探测灵敏度 (Sensitivity)', unit: '' },
        { name: '探测精度 (Detection Accuracy)', unit: '' },
        { name: '数据存储容量 (Storage)', unit: 'TB' },
        { name: '工作温度范围 (Temp Range)', unit: '°C' },
        { name: '任务周期 (Mission Duration)', unit: '年' },
      ],
    },
  ];

export interface PBSFormProps {
  nodeId: string;
  initialData?: PBSProps;
  onUpdate?: (data: PBSProps) => void;
  /** Story 9.5: Open asset preview modal in parent PropertyPanel */
  onAssetPreview?: (asset: DataAssetWithFolder) => void;
}

export function PBSForm({ nodeId, initialData, onUpdate, onAssetPreview }: PBSFormProps) {
  const [formData, setFormData] = useState<PBSProps>({
    code: initialData?.code || '',
    version: initialData?.version || 'v1.0.0',
    ownerId: initialData?.ownerId || '',
    indicators: initialData?.indicators || [],
    productRef: initialData?.productRef,
  });

  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  const bindingContext = useDataLibraryBindingOptional();
  const { addToast } = useToast();

  // MEDIUM-3 Fix: Refs for click outside handling
  const presetDropdownRef = useRef<HTMLDivElement>(null);
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormData({
      code: initialData?.code || '',
      version: initialData?.version || 'v1.0.0',
      ownerId: initialData?.ownerId || '',
      indicators: initialData?.indicators || [],
      productRef: initialData?.productRef,
    });
  }, [initialData]);

  // MEDIUM-3 Fix: Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetDropdownRef.current && !presetDropdownRef.current.contains(event.target as Node)) {
        setShowPresetDropdown(false);
      }
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setShowTemplateDropdown(false);
      }
    };

    if (showPresetDropdown || showTemplateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPresetDropdown, showTemplateDropdown]);

  const handleFieldChange = (field: keyof PBSProps, value: unknown) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  };

  // Story 2.7: Indicator management
  const handleAddIndicators = useCallback(
    (items: IndicatorPreset[]) => {
      const newIndicators: PBSIndicator[] = items.map((preset) => ({
        id: nanoid(8),
        name: preset.name || '',
        unit: preset.unit || '',
        targetValue: preset.targetValue ?? '',
        actualValue: preset.actualValue ?? '',
      }));
      const updatedIndicators = [...(formData.indicators || []), ...newIndicators];
      const updated = { ...formData, indicators: updatedIndicators };
      setFormData(updated);
      onUpdate?.(updated);
      setShowPresetDropdown(false);
      setShowTemplateDropdown(false);
    },
    [formData, onUpdate]
  );

  const handleAddIndicator = useCallback(
    (preset?: IndicatorPreset) => {
      handleAddIndicators([preset ?? { name: '', unit: '' }]);
    },
    [handleAddIndicators]
  );

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const template = INDICATOR_TEMPLATES.find((item) => item.id === templateId);
      if (!template) return;
      handleAddIndicators(template.indicators);
    },
    [handleAddIndicators]
  );

  const handleIndicatorChange = useCallback(
    (id: string, field: keyof PBSIndicator, value: string) => {
      const indicators = (formData.indicators || []).map((ind) =>
        ind.id === id ? { ...ind, [field]: value } : ind
      );
      const updated = { ...formData, indicators };
      setFormData(updated);
      onUpdate?.(updated);
    },
    [formData, onUpdate]
  );

  const handleDeleteIndicator = useCallback(
    (id: string) => {
      const indicators = (formData.indicators || []).filter((ind) => ind.id !== id);
      const updated = { ...formData, indicators };
      setFormData(updated);
      onUpdate?.(updated);
    },
    [formData, onUpdate]
  );

  // Story 2.7: Product selection
  const handleProductSelect = useCallback(
    (product: ProductReference) => {
      const updated = { ...formData, productRef: product };
      setFormData(updated);
      onUpdate?.(updated);
    },
    [formData, onUpdate]
  );

  // HIGH-1 Fix: Use null instead of undefined to properly clear backend data
  const handleUnlinkProduct = useCallback(() => {
    const updated = { ...formData, productRef: null };
    setFormData(updated);
    onUpdate?.(updated);
  }, [formData, onUpdate]);

  const handleAddAssetClick = useCallback(() => {
    if (bindingContext) {
      bindingContext.openForBinding({ nodeId });
      return;
    }

    addToast({
      type: 'info',
      title: '关联数据资产',
      description: '请在右侧"数据资源库"中选择资产并确认绑定',
    });
  }, [addToast, bindingContext, nodeId]);

  return (
    <div className="space-y-5">
      {/* PBS Code */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Hash className="w-4 h-4" />
          PBS 编码
        </label>
        <input
          type="text"
          value={formData.code ?? ''}
          onChange={(e) => handleFieldChange('code', e.target.value)}
          placeholder="例如: PBS-001"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">产品分解结构唯一标识符</p>
      </div>

      {/* Version */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4" />
          版本号
        </label>
        <input
          type="text"
          value={formData.version ?? ''}
          onChange={(e) => handleFieldChange('version', e.target.value)}
          placeholder="例如: v1.0.0"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">语义化版本号 (Semantic Versioning)</p>
      </div>

      {/* Owner */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <User className="w-4 h-4" />
          负责人
        </label>
        <input
          type="text"
          value={formData.ownerId ?? ''}
          onChange={(e) => handleFieldChange('ownerId', e.target.value)}
          placeholder="输入负责人 ID 或邮箱"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Story 2.7: Product Library Link */}
      <div className="border-t border-gray-200 pt-4">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-blue-500" />
          产品库关联
        </label>

        {formData.productRef ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {formData.productRef.productName}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="info" className="font-mono">
                    {formData.productRef.productCode}
                  </Badge>
                  {formData.productRef.category && (
                    <span className="text-xs text-gray-500">
                      {formData.productRef.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUnlinkProduct}
              className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
              title="取消关联"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowProductSearch(true)}
            className="w-full border-dashed hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50"
          >
            <Link className="w-4 h-4" />
            关联产品库产品
          </Button>
        )}
      </div>

      {/* Story 2.7: Indicators Section */}
      <div className="border-t border-gray-200 pt-4">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-emerald-500" />
          技术指标
        </label>

        {/* Indicator List */}
        {(formData.indicators || []).length > 0 && (
          <div className="space-y-3 mb-3">
            {(formData.indicators || []).map((indicator) => (
              <div
                key={indicator.id}
                className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-all group"
              >
                {/* Row 1: Name and Delete */}
                <div className="flex items-start gap-2 mb-2 border-b border-gray-100 pb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={indicator.name}
                      onChange={(e) =>
                        handleIndicatorChange(indicator.id, 'name', e.target.value)
                      }
                      placeholder="指标名称"
                      className="w-full text-sm font-medium text-gray-900 placeholder:text-gray-400 border-none p-0 focus:ring-0 bg-transparent"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteIndicator(indicator.id)}
                    className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                    title="删除指标"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Row 2: Values Grid */}
                <div className="grid grid-cols-[60px_1fr_1fr] gap-2">
                  {/* Unit */}
                  <div className="bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
                    <label className="block text-[10px] text-gray-400 mb-0.5 scale-90 origin-left">
                      单位
                    </label>
                    <input
                      type="text"
                      value={indicator.unit || ''}
                      onChange={(e) =>
                        handleIndicatorChange(indicator.id, 'unit', e.target.value)
                      }
                      className="w-full text-xs bg-transparent border-none p-0 focus:ring-0 text-gray-700 font-medium"
                      placeholder="单位"
                    />
                  </div>

                  {/* Target */}
                  <div className="bg-emerald-50/30 rounded px-2 py-1.5 border border-emerald-100/50">
                    <label className="block text-[10px] text-emerald-600 mb-0.5 scale-90 origin-left">
                      目标值
                    </label>
                    <input
                      type="text"
                      value={indicator.targetValue}
                      onChange={(e) =>
                        handleIndicatorChange(indicator.id, 'targetValue', e.target.value)
                      }
                      className="w-full text-xs bg-transparent border-none p-0 focus:ring-0 text-emerald-700 font-medium"
                      placeholder="目标值"
                    />
                  </div>

                  {/* Actual */}
                  <div className="bg-blue-50/30 rounded px-2 py-1.5 border border-blue-100/50">
                    <label className="block text-[10px] text-blue-600 mb-0.5 scale-90 origin-left">
                      实际值
                    </label>
                    <input
                      type="text"
                      value={indicator.actualValue || ''}
                      onChange={(e) =>
                        handleIndicatorChange(indicator.id, 'actualValue', e.target.value)
                      }
                      className="w-full text-xs bg-transparent border-none p-0 focus:ring-0 text-blue-700 font-medium"
                      placeholder="实际值"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Indicator Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddIndicator()}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            添加指标
          </Button>

          {/* Preset Dropdown */}
          <div className="relative" ref={presetDropdownRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Target className="w-3.5 h-3.5" />
              常用指标
              <ChevronDown className="w-3 h-3" />
            </Button>

            {showPresetDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                {INDICATOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleAddIndicator(preset)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span>{preset.name}</span>
                    {preset.unit && (
                      <span className="ml-2 text-xs text-gray-400">({preset.unit})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Satellite Template Dropdown */}
          <div className="relative" ref={templateDropdownRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              卫星模板
              <ChevronDown className="w-3 h-3" />
            </Button>

            {showTemplateDropdown && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {INDICATOR_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleApplyTemplate(template.id)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Badge */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="flex items-center gap-2 text-xs text-blue-700">
          <Box className="w-4 h-4" />
          <span className="font-medium">产品分解结构 (PBS)</span>
        </div>
        {formData.code && (
          <div className="mt-2 text-xs text-gray-600">
            当前编码: <span className="font-mono font-medium">{formData.code}</span>
          </div>
        )}
        {formData.productRef && (
          <div className="mt-1 text-xs text-gray-600">
            关联产品: <span className="font-medium">{formData.productRef.productCode}</span>
          </div>
        )}
        {(formData.indicators || []).length > 0 && (
          <div className="mt-1 text-xs text-gray-600">
            指标数量: <span className="font-medium">{formData.indicators?.length}</span>
          </div>
        )}
      </div>

      <LinkedAssetsSection
        nodeId={nodeId}
        onAddClick={handleAddAssetClick}
        onPreview={(link) => onAssetPreview?.(link.asset)}
      />

      {/* Product Search Dialog */}
      <ProductSearchDialog
        open={showProductSearch}
        onOpenChange={setShowProductSearch}
        onSelect={handleProductSelect}
      />
    </div>
  );
}
