/**
 * Story 2.9: APP Executor Service
 * Simulates execution of APP nodes and generates mock outputs
 */

import { Injectable, Logger } from '@nestjs/common';
import type { AppProps, AppOutput } from '@cdm/types';
import { randomUUID } from 'crypto';

export interface ExecutionResult {
  outputs: AppOutput[];
  error?: string;
  executedAt: string;
}

@Injectable()
export class AppExecutorService {
  private readonly logger = new Logger(AppExecutorService.name);

  /**
   * Simulate APP node execution
   * @param nodeId - The node ID being executed
   * @param appProps - The APP node properties
   * @returns Simulated execution result with mock outputs
   */
  async execute(nodeId: string, appProps: AppProps): Promise<ExecutionResult> {
    this.logger.log(`Executing APP node: ${nodeId}`);
    this.logger.debug(`Props: ${JSON.stringify(appProps)}`);

    // Simulate execution delay (1-3 seconds)
    const delay = 1000 + Math.random() * 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Optional failure rate for demo/testing (default 0 to avoid flaky tests)
    const failureRate = Number(process.env.APP_EXECUTION_FAILURE_RATE ?? '0');
    if (failureRate > 0 && Math.random() < failureRate) {
      this.logger.warn(`Simulated failure for node: ${nodeId}`);
      return {
        outputs: [],
        error: '模拟执行失败：网络超时或服务不可用',
        executedAt: new Date().toISOString(),
      };
    }

    // Generate mock outputs based on the configured outputs
    const outputs: AppOutput[] = (appProps.outputs || []).map((output) => ({
      ...output,
      id: output.id || randomUUID(),
      value: this.generateMockOutputValue(output, appProps),
      fileName: this.generateMockFileName(output),
      generatedAt: new Date().toISOString(),
    }));

    this.logger.log(`Execution completed for node: ${nodeId}, outputs: ${outputs.length}`);

    return {
      outputs,
      executedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate mock output value based on type
   * Enhanced with satellite-related professional data
   */
  private generateMockOutputValue(output: AppOutput, appProps: AppProps): string {
    const appName = (appProps.libraryAppName || '').toLowerCase();
    const key = output.key.toLowerCase();

    if (output.type === 'text') {
      // Satellite orbit analysis results
      if (key.includes('period') || key.includes('周期') || key.includes('轨道周期')) {
        const period = 90 + Math.random() * 30;
        return `${period.toFixed(2)} 分钟 (${(period / 60).toFixed(4)} 小时)`;
      }
      if (key.includes('altitude') || key.includes('高度') || key.includes('轨道高度')) {
        const altitude = 400 + Math.random() * 200;
        return `${altitude.toFixed(1)} km (LEO 轨道)`;
      }
      if (key.includes('inclination') || key.includes('倾角') || key.includes('轨道倾角')) {
        const inc = 45 + Math.random() * 53;
        return `${inc.toFixed(2)}°`;
      }
      if (key.includes('eccentricity') || key.includes('偏心率')) {
        return `${(Math.random() * 0.02).toFixed(6)}`;
      }
      if (key.includes('velocity') || key.includes('速度') || key.includes('轨道速度')) {
        const v = 7.5 + Math.random() * 0.8;
        return `${v.toFixed(3)} km/s`;
      }
      if (key.includes('coverage') || key.includes('覆盖')) {
        return `地面覆盖范围：半径 ${(2000 + Math.random() * 1500).toFixed(0)} km`;
      }

      // Link budget / RF analysis results
      if (key.includes('margin') || key.includes('余量') || key.includes('链路余量')) {
        return `${(5 + Math.random() * 20).toFixed(2)} dB (满足 ≥3dB 设计要求)`;
      }
      if (key.includes('eirp')) {
        return `${(30 + Math.random() * 15).toFixed(1)} dBW`;
      }
      if (key.includes('g/t') || key.includes('品质因数')) {
        return `${(-5 + Math.random() * 20).toFixed(1)} dB/K`;
      }
      if (key.includes('c/n') || key.includes('载噪比')) {
        return `${(10 + Math.random() * 15).toFixed(2)} dB`;
      }
      if (key.includes('ber') || key.includes('误码率')) {
        const exp = Math.floor(6 + Math.random() * 6);
        return `< 1×10^-${exp}`;
      }
      if (key.includes('data_rate') || key.includes('数传速率') || key.includes('传输速率')) {
        const rates = [1.2, 2.4, 4.8, 10, 25, 50, 100, 150];
        return `${rates[Math.floor(Math.random() * rates.length)]} Mbps`;
      }

      // Power analysis results
      if (key.includes('balance') || key.includes('平衡') || key.includes('功率平衡')) {
        const margin = 50 + Math.random() * 150;
        return `功率余量 ${margin.toFixed(1)} W ✓`;
      }
      if (key.includes('solar') || key.includes('太阳能') || key.includes('帆板')) {
        return `输出功率 ${(800 + Math.random() * 400).toFixed(0)} W @EOL`;
      }
      if (key.includes('battery') || key.includes('蓄电池') || key.includes('电池')) {
        return `DOD ${(20 + Math.random() * 20).toFixed(1)}%, 循环寿命 ${(8000 + Math.random() * 7000).toFixed(0)} 次`;
      }
      if (key.includes('consumption') || key.includes('功耗')) {
        return `平均功耗 ${(200 + Math.random() * 300).toFixed(0)} W，峰值 ${(400 + Math.random() * 400).toFixed(0)} W`;
      }

      // Thermal analysis results
      if (key.includes('temperature') || key.includes('温度') || key.includes('热')) {
        const tMin = -40 + Math.random() * 20;
        const tMax = 50 + Math.random() * 30;
        return `工作温度范围：${tMin.toFixed(1)}°C ~ +${tMax.toFixed(1)}°C`;
      }

      // Attitude control results
      if (key.includes('stability') || key.includes('稳定') || key.includes('姿态精度')) {
        const accuracy = 0.01 + Math.random() * 0.1;
        return `三轴稳定，指向精度 ±${accuracy.toFixed(3)}°`;
      }
      if (key.includes('agility') || key.includes('机动') || key.includes('姿态机动')) {
        return `侧摆能力 ±${(25 + Math.random() * 20).toFixed(0)}°，机动时间 ${(60 + Math.random() * 60).toFixed(0)}s`;
      }

      // Structure / Mass analysis results
      if (key.includes('mass') || key.includes('质量') || key.includes('重量')) {
        return `干重 ${(800 + Math.random() * 400).toFixed(0)} kg，含推进剂 ${(1000 + Math.random() * 500).toFixed(0)} kg`;
      }
      if (key.includes('frequency') || key.includes('频率') || key.includes('固有频率')) {
        return `一阶固有频率 ${(15 + Math.random() * 20).toFixed(1)} Hz (≥10Hz 要求)`;
      }

      // Propulsion results
      if (key.includes('delta_v') || key.includes('速度增量') || key.includes('dv')) {
        return `ΔV 预算 ${(150 + Math.random() * 100).toFixed(1)} m/s`;
      }
      if (key.includes('isp') || key.includes('比冲')) {
        return `比冲 ${(200 + Math.random() * 120).toFixed(0)} s`;
      }

      // Summary / Report results
      if (key.includes('summary') || key.includes('报告') || key.includes('结论')) {
        const status = Math.random() > 0.1 ? '通过' : '需复核';
        return `卫星系统分析完成于 ${new Date().toLocaleString()}，整星指标评估：${status}`;
      }
      if (key.includes('status') || key.includes('状态')) {
        return '✓ 分析完成，所有指标满足任务要求';
      }

      // Default
      return `模拟结果 (${output.key}): ${(Math.random() * 100).toFixed(2)}`;
    }

    // For file type, return mock file URL with satellite-themed names
    const filename = this.generateMockFileName(output, appName);
    const libraryApp = appProps.libraryAppName || 'SatelliteAnalyzer';
    return `/api/mock/files/${encodeURIComponent(libraryApp)}/${filename}`;
  }

  /**
   * Generate mock file name with satellite-themed naming
   */
  private generateMockFileName(output: AppOutput, appName?: string): string {
    if (output.fileName) {
      return output.fileName;
    }

    const key = output.key.replace(/\s+/g, '_').toLowerCase();
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');

    // Determine extension based on mimeType
    let ext = 'dat';
    if (output.mimeType) {
      const mimeToExt: Record<string, string> = {
        'application/json': 'json',
        'application/pdf': 'pdf',
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'text/plain': 'txt',
        'text/csv': 'csv',
        'application/vnd.ms-excel': 'xlsx',
        'application/octet-stream': 'bin',
      };
      ext = mimeToExt[output.mimeType] || 'dat';
    } else {
      // Infer from key name
      if (key.includes('report') || key.includes('报告')) ext = 'pdf';
      else if (key.includes('data') || key.includes('数据')) ext = 'csv';
      else if (key.includes('image') || key.includes('图') || key.includes('plot')) ext = 'png';
      else if (key.includes('config') || key.includes('配置')) ext = 'json';
    }

    // Generate satellite-themed file names
    const satellitePrefix = appName?.includes('stk') ? 'STK' :
      appName?.includes('orbit') ? 'ORB' :
        appName?.includes('link') ? 'LNK' :
          appName?.includes('power') ? 'PWR' :
            appName?.includes('thermal') ? 'THM' :
              appName?.includes('structure') ? 'STR' :
                'SAT';

    return `${satellitePrefix}_${key}_${timestamp}_${seq}.${ext}`;
  }
}
