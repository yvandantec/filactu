import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Dialog, IconPicker } from '../../src/ui/dialogs';

const tick = () => new Promise((r) => setTimeout(r, 0));

/** Un bouton qui ouvre une fenêtre, comme dans l'appli. */
function Opener({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); onClose?.(); };
  return (
    <>
      <button onClick={() => setOpen(true)}>Ouvrir</button>
      {open && (
        <Dialog title="Essai" onClose={close}>
          <input aria-label="Nom" />
          <button>Valider</button>
        </Dialog>
      )}
    </>
  );
}

afterEach(cleanup);

describe('fenêtres (ENF-02)', () => {
  test('ENF-02 · la fenêtre reçoit le focus à l’ouverture et le rend au bouton à la fermeture', async () => {
    render(<Opener />);
    const opener = screen.getByRole('button', { name: 'Ouvrir' });
    opener.focus();
    fireEvent.click(opener);
    await tick();
    const dialog = screen.getByRole('dialog', { name: 'Essai' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    await tick();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  test('ENF-02 · Échap ferme la fenêtre', async () => {
    const onClose = vi.fn();
    render(<Opener onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await tick();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('ENF-02 · Tab ne sort pas de la fenêtre', async () => {
    render(<Opener />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await tick();
    const dialog = screen.getByRole('dialog', { name: 'Essai' });
    const close = screen.getByRole('button', { name: 'Fermer' });
    const last = screen.getByRole('button', { name: 'Valider' });
    // jsdom ne calcule pas la mise en page : on rend les éléments « visibles » pour le test
    for (const el of dialog.querySelectorAll<HTMLElement>('button, input')) Object.defineProperty(el, 'offsetParent', { get: () => dialog });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});

describe('palette d’icônes (EXG-016)', () => {
  test('EXG-016 · choisir ou retirer une icône, le choix en cours est annoncé', () => {
    const onChange = vi.fn();
    render(<IconPicker label="Icône de la catégorie" value="🎭" onChange={onChange} />);
    const group = screen.getByRole('radiogroup', { name: 'Icône de la catégorie' });
    expect(group.querySelector('[aria-checked="true"]')?.getAttribute('aria-label')).toBe('Icône 🎭');
    fireEvent.click(screen.getByRole('radio', { name: 'Aucune icône' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByRole('radio', { name: 'Icône 🎮' }));
    expect(onChange).toHaveBeenLastCalledWith('🎮');
  });
});
