/**
 * @fileoverview Tests for PhysicsSettings component.
 * Tests UI behavior AND VSCode message sending.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhysicsSettings from '../../src/webview/components/PhysicsSettings';
import { IPhysicsSettings } from '../../src/shared/contracts';

// Access the global message tracker from setup.ts
declare const globalThis: {
  __vscodeSentMessages: unknown[];
};

describe('PhysicsSettings', () => {
  const defaultSettings: IPhysicsSettings = {
    repelForce: 5,
    linkDistance: 100,
    linkForce: 0.08,
    damping: 0.4,
    centerForce: 0.01,
  };

  beforeEach(() => {
    // Clear any previous messages
    if (globalThis.__vscodeSentMessages) {
      globalThis.__vscodeSentMessages.length = 0;
    }
  });

  describe('collapsed state', () => {
    it('should render settings button when collapsed', () => {
      render(<PhysicsSettings settings={defaultSettings} />);
      
      // Should show the settings icon button
      const button = screen.getByTitle('Physics Settings');
      expect(button).toBeInTheDocument();
    });

    it('should expand when button is clicked', () => {
      render(<PhysicsSettings settings={defaultSettings} />);
      
      const button = screen.getByTitle('Physics Settings');
      fireEvent.click(button);
      
      // Should now show the settings panel
      expect(screen.getByText('Physics Settings')).toBeInTheDocument();
    });
  });

  describe('expanded state', () => {
    it('should show all sliders when expanded', () => {
      render(<PhysicsSettings settings={defaultSettings} />);
      
      // Expand
      fireEvent.click(screen.getByTitle('Physics Settings'));
      
      // Check for labels
      expect(screen.getByText('Repel Force')).toBeInTheDocument();
      expect(screen.getByText('Link Distance')).toBeInTheDocument();
      expect(screen.getByText('Link Force')).toBeInTheDocument();
      expect(screen.getByText('Center Force')).toBeInTheDocument();
      expect(screen.getByText('Damping')).toBeInTheDocument();
    });

    it('should show reset button', () => {
      render(<PhysicsSettings settings={defaultSettings} />);
      
      fireEvent.click(screen.getByTitle('Physics Settings'));
      
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    it('should collapse when close button is clicked', () => {
      render(<PhysicsSettings settings={defaultSettings} />);
      
      // Expand
      fireEvent.click(screen.getByTitle('Physics Settings'));
      expect(screen.getByText('Physics Settings')).toBeInTheDocument();
      
      // Close
      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);
      
      // Should be collapsed again
      expect(screen.queryByText('Reset to Defaults')).not.toBeInTheDocument();
    });

    it('should have correct number of sliders', () => {
      render(<PhysicsSettings settings={defaultSettings} />);
      
      fireEvent.click(screen.getByTitle('Physics Settings'));
      
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBe(5);
    });
  });

  describe('slider interactions', () => {
    it('should call onSettingsChange when slider changes', () => {
      const onSettingsChange = vi.fn();
      render(
        <PhysicsSettings 
          settings={defaultSettings} 
          onSettingsChange={onSettingsChange} 
        />
      );
      
      // Expand
      fireEvent.click(screen.getByTitle('Physics Settings'));
      
      // Find gravity slider (first one)
      const sliders = screen.getAllByRole('slider');
      
      // Change first slider (repel force)
      fireEvent.change(sliders[0], { target: { value: '10' } });

      // Should call onSettingsChange
      expect(onSettingsChange).toHaveBeenCalledWith({
        ...defaultSettings,
        repelForce: 10,
      });
    });

    it('should update linkDistance when second slider changes', () => {
      const onSettingsChange = vi.fn();
      render(
        <PhysicsSettings
          settings={defaultSettings}
          onSettingsChange={onSettingsChange}
        />
      );

      fireEvent.click(screen.getByTitle('Physics Settings'));

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[1], { target: { value: '200' } });

      expect(onSettingsChange).toHaveBeenCalledWith({
        ...defaultSettings,
        linkDistance: 200,
      });
    });

    it('should update linkForce when third slider changes', () => {
      const onSettingsChange = vi.fn();
      render(
        <PhysicsSettings
          settings={defaultSettings}
          onSettingsChange={onSettingsChange}
        />
      );

      fireEvent.click(screen.getByTitle('Physics Settings'));

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[2], { target: { value: '0.5' } });

      expect(onSettingsChange).toHaveBeenCalledWith({
        ...defaultSettings,
        linkForce: 0.5,
      });
    });
  });

  describe('value display', () => {
    it('should display current values', () => {
      const settings: IPhysicsSettings = {
        repelForce: 8,
        linkDistance: 150,
        linkForce: 0.12,
        damping: 0.5,
        centerForce: 0.05,
      };
      
      render(<PhysicsSettings settings={settings} />);
      
      // Expand
      fireEvent.click(screen.getByTitle('Physics Settings'));
      
      // Check displayed values (formatted)
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('0.12')).toBeInTheDocument();
      expect(screen.getByText('0.50')).toBeInTheDocument();
      expect(screen.getByText('0.05')).toBeInTheDocument();
    });

    it('should update displayed value when settings change', () => {
      const { rerender } = render(<PhysicsSettings settings={defaultSettings} />);

      fireEvent.click(screen.getByTitle('Physics Settings'));

      // Initial value
      expect(screen.getByText('5')).toBeInTheDocument();

      // Update settings
      const newSettings = { ...defaultSettings, repelForce: 15 };
      rerender(<PhysicsSettings settings={newSettings} />);

      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  describe('VSCode message sending', () => {
    it('should send UPDATE_PHYSICS_SETTING message when slider changes', () => {
      render(<PhysicsSettings settings={defaultSettings} />);

      // Expand panel
      fireEvent.click(screen.getByTitle('Physics Settings'));

      // Change first slider (repel force)
      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '10' } });

      // Should have sent message to VSCode
      const messages = globalThis.__vscodeSentMessages || [];
      const updateMessage = messages.find(
        (msg: unknown) => (msg as { type: string }).type === 'UPDATE_PHYSICS_SETTING'
      );

      expect(updateMessage).toBeDefined();
      expect(updateMessage).toEqual({
        type: 'UPDATE_PHYSICS_SETTING',
        payload: { key: 'repelForce', value: 10 },
      });
    });

    it('should send RESET_PHYSICS_SETTINGS message when reset button is clicked', () => {
      render(<PhysicsSettings settings={defaultSettings} />);

      // Expand panel
      fireEvent.click(screen.getByTitle('Physics Settings'));

      // Click reset button
      fireEvent.click(screen.getByText('Reset to Defaults'));

      // Should have sent message to VSCode
      const messages = globalThis.__vscodeSentMessages || [];
      const resetMessage = messages.find(
        (msg: unknown) => (msg as { type: string }).type === 'RESET_PHYSICS_SETTINGS'
      );
      
      expect(resetMessage).toBeDefined();
      expect(resetMessage).toEqual({ type: 'RESET_PHYSICS_SETTINGS' });
    });

    it('should send UPDATE_PHYSICS_SETTING for each slider type', () => {
      render(<PhysicsSettings settings={defaultSettings} />);
      
      fireEvent.click(screen.getByTitle('Physics Settings'));
      
      const sliders = screen.getAllByRole('slider');
      const expectedKeys = [
        'repelForce',
        'linkDistance',
        'linkForce',
        'centerForce',
        'damping',
      ];
      
      sliders.forEach((slider, index) => {
        // Clear messages before each slider change
        globalThis.__vscodeSentMessages.length = 0;
        
        fireEvent.change(slider, { target: { value: '0.5' } });
        
        const messages = globalThis.__vscodeSentMessages;
        const updateMessage = messages.find(
          (msg: unknown) => (msg as { type: string }).type === 'UPDATE_PHYSICS_SETTING'
        ) as { type: string; payload: { key: string; value: number } } | undefined;
        
        expect(updateMessage).toBeDefined();
        expect(updateMessage?.payload.key).toBe(expectedKeys[index]);
      });
    });
  });
});
