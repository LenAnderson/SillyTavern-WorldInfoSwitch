import { characters, chat_metadata, event_types, eventSource, saveSettingsDebounced, selectCharacterById, setActiveCharacter, setActiveGroup, this_chid } from '../../../../script.js';
import { extension_settings, getContext } from '../../../extensions.js';
import { groups } from '../../../group-chats.js';
import { executeSlashCommandsWithOptions } from '../../../slash-commands.js';
import { delay } from '../../../utils.js';
import { loadWorldInfo, saveWorldInfo, world_info, world_names } from '../../../world-info.js';

let isDiscord = null;
let currentChar;
/**@type {HTMLElement}*/
let trigger;
let menu = false;
const settings = Object.assign({
    numCards: 10,
}, extension_settings.wiSwitchx ?? {});
extension_settings.wiSwitch = settings;



const getBookNames = ()=>{
    const context = getContext();
    const names = [
        ...(world_info.globalSelect ?? []),
        // chat_metadata.world_info,
        // characters[context.characterId]?.data?.character_book?.name,
        // ...world_info.charLore?.find(it=>it.name == characters[context.characterId]?.avatar?.split('.')?.slice(0,-1)?.join('.'))?.extraBooks ?? [],
        // ...(groups
        //     .find(it=>it.id == context.groupId)
        //     ?.members
        //     ?.map(m=>[
        //         characters.find(it=>it.avatar == m)?.data?.character_book?.name,
        //         ...(world_info.charLore?.find(it=>it.name == m.split('.').slice(0,-1).join('.'))?.extraBooks ?? []),
        //     ])
        //         ?? []
        // ),
    ].filter(it=>it);
    return names;
};

const contextListener = async(evt)=>{
    if (menu) return;
    menu = true;
    evt.preventDefault();
    const books = [...world_names];
    const active = getBookNames();
    const entries = {};
    books.forEach(async(it)=>{
        entries[it] = loadWorldInfo(it);
    });
    let book;
    const ctx = document.createElement('div'); {
        ctx.classList.add('stwis--ctxBlocker');
        ctx.title = '';
        ctx.addEventListener('click', (evt)=>{
            evt.stopPropagation();
            ctx.remove();
            menu = false;
        });
        const wrapper = document.createElement('div'); {
            wrapper.classList.add('stwis--wrapper');
            const rect = trigger.getBoundingClientRect();
            wrapper.style.setProperty('--stwis--y', `${rect.bottom}px`);
            wrapper.style.left = isDiscord ? 'var(--nav-bar-width)' : `${rect.left}px`;
            const list = document.createElement('ul'); {
                list.classList.add('stwis--ctxMenu');
                list.classList.add('list-group');
                for (const c of books) {
                    const item = document.createElement('li'); {
                        item.classList.add('stwis--ctxItem');
                        item.classList.add('list-group-item');
                        item.setAttribute('data-stwis--char', c);
                        item.addEventListener('pointerenter', async()=>{
                            if (c != book) {
                                book = c;
                                elist.innerHTML = 'Loading...';
                                const data = await entries[c];
                                elist.innerHTML = '';
                                for (const e of Object.values(data.entries)) {
                                    const item = document.createElement('li'); {
                                        item.classList.add('stwis--ctxItem');
                                        item.classList.add('list-group-item');
                                        item.setAttribute('data-stwis--char', e.uid);
                                        const lbl = document.createElement('label'); {
                                            lbl.addEventListener('click', async(evt)=>{
                                                evt.stopPropagation();
                                                cb.style.pointerEvents = 'none';
                                                cb.style.opacity = '0.5';
                                                e.disable = !cb.checked;
                                                await saveWorldInfo(c, data);
                                                cb.style.opacity = '1';
                                                cb.style.pointerEvents = '';
                                            });
                                            const cb = document.createElement('input'); {
                                                cb.type = 'checkbox';
                                                cb.checked = !e.disable;
                                                lbl.append(cb);
                                            }
                                            const name = document.createElement('div'); {
                                                name.classList.add('stwis--ctxName');
                                                name.textContent = e.comment || e.key.join(', ');
                                                lbl.append(name);
                                            }
                                            item.append(lbl);
                                        }
                                        elist.append(item);
                                    }
                                }
                            }
                        });
                        const lbl = document.createElement('label'); {
                            lbl.addEventListener('click', async(evt)=>{
                                evt.stopPropagation();
                                cb.style.pointerEvents = 'none';
                                cb.style.opacity = '0.5';
                                await executeSlashCommandsWithOptions(`/world state=${cb.checked ? 'on' : 'off'} silent=true ${c}`);
                                cb.style.opacity = '1';
                                cb.style.pointerEvents = '';
                            });
                            const cb = document.createElement('input'); {
                                cb.type = 'checkbox';
                                cb.checked = active.includes(c);
                                lbl.append(cb);
                            }
                            const name = document.createElement('div'); {
                                name.classList.add('stwis--ctxName');
                                name.textContent = c;
                                lbl.append(name);
                            }
                            item.append(lbl);
                        }
                        list.append(item);
                    }
                }
                wrapper.append(list);
            }
            const elist = document.createElement('ul'); {
                elist.classList.add('stwis--ctxMenu');
                elist.classList.add('stwis--secondary');
                elist.classList.add('list-group');
                wrapper.append(elist);
            }
            ctx.append(wrapper);
        }
        document.body.append(ctx);
        trigger.append(ctx);
    }
};




const checkDiscord = async()=>{
    let newIsDiscord = window.getComputedStyle(document.body).getPropertyValue('--nav-bar-width') !== '';
    if (isDiscord != newIsDiscord) {
        isDiscord = newIsDiscord;
        document.body.classList[isDiscord ? 'add' : 'remove']('stcs');
        document.body.classList[isDiscord ? 'remove' : 'add']('stwis--nonDiscord');
        if (isDiscord) {
            trigger.style.setProperty('--stwis--iconSize', 'calc(var(--nav-bar-width) - 16px)');
        } else {
            trigger.style.setProperty('--stwis--iconSize', 'calc(var(--topBarBlockSize))');
        }
    }
    setTimeout(checkDiscord, 2000);
};

const btn = /**@type {HTMLElement}*/(document.querySelector('#WI-SP-button'));
const icon = /**@type {HTMLElement}*/(document.querySelector('#WIDrawerIcon'));
let count = 0;
let books = [];
const updateIcon = async()=>{
    const newBooks = getBookNames();
    icon.title = `World Info\n---\n${newBooks.join('\n')}`;
    if (count != newBooks.length) {
        if (newBooks.length == 0) {
            btn.classList.add('stwis--out');
            await delay(510);
            btn.setAttribute('data-stwis--count', newBooks.length.toString());
            btn.classList.remove('stwis--out');
        } else if (count == 0) {
            btn.classList.add('stwis--in');
            btn.setAttribute('data-stwis--count', newBooks.length.toString());
            await delay(510);
            btn.classList.remove('stwis--in');
        } else {
            btn.setAttribute('data-stwis--count', newBooks.length.toString());
            btn.classList.add('stwis--bounce');
            await delay(1010);
            btn.classList.remove('stwis--bounce');
        }
        count = newBooks.length;
    } else if (new Set(newBooks).difference(new Set(books)).size > 0) {
        btn.classList.add('stwis--bounce');
        await delay(1010);
        btn.classList.remove('stwis--bounce');
    }
    books = newBooks;
};
eventSource.on(event_types.SETTINGS_UPDATED, ()=>updateIcon());

const init = ()=>{
    trigger = document.querySelector('#WI-SP-button > .drawer-toggle');
    trigger.addEventListener('contextmenu', contextListener);
    checkDiscord();
    updateIcon();
};
init();
