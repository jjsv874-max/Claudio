import { chromium } from 'playwright';
const XLSX_PATH=process.env.XLSX_PATH||new URL('../samples/BASE_EXEMPLO_ATUALIZADA.xlsx',import.meta.url).pathname;
const EXEC='/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const PAGE_URL='http://127.0.0.1:4601/';
const errors=[];
const browser=await chromium.launch({executablePath:EXEC});
const page=await browser.newPage();
page.on('console',m=>{ if(m.type()==='error') errors.push('CONSOLE: '+m.text()); });
page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message));
await page.goto(PAGE_URL,{waitUntil:'networkidle'});

function log(...a){console.log(...a);}
// Upload
await page.setInputFiles('input[type=file]', XLSX_PATH);
await page.getByText('BASE_EXEMPLO_ATUALIZADA.xlsx').waitFor({timeout:5000});
log('✅ arquivo selecionado');
await page.getByRole('button',{name:'Processar planilha'}).click();
// Wait for dashboard
await page.getByText('Ranking de analistas').waitFor({timeout:10000});
log('✅ processou e abriu Dashboard');

// KPIs
const kpiProc = await page.locator('.kpi .v').nth(1).innerText();
log('   KPI Processos únicos =', kpiProc);

// Ranking rows
const analystRows = await page.locator('.analyst-row').count();
log('   analistas no ranking =', analystRows);

// Matrix present
const matrixRows = await page.locator('.matrix tbody tr').count();
log('   linhas matriz =', matrixRows);

// Open a process from focus critical or matrix -> click first analyst-row then a critical card
await page.locator('.analyst-row').first().click();
await page.waitForTimeout(200);

// Timeline tab
await page.getByRole('button',{name:'Timeline',exact:true}).click();
await page.locator('.flow-nav-btn').first().waitFor();
const navCounts = await page.locator('.flow-nav-count').allInnerTexts();
log('✅ Timeline aberta; contagens etapas =', navCounts.join(','));
const cardCount = await page.locator('.flow-card').count();
log('   cards na etapa 01 =', cardCount);
// open process modal
await page.locator('.flow-card').first().click();
await page.locator('.modal').waitFor({timeout:3000});
const modalTitle = await page.locator('.modal-head h3').innerText();
log('✅ modal de processo aberto:', modalTitle);
const hasTimeline = await page.locator('.timeline-track').count();
log('   linha do tempo presente =', hasTimeline>0);
await page.locator('.modal-close').click();

// Calendar tab
await page.getByRole('button',{name:'Calendário',exact:true}).click();
await page.locator('.cal-grid').waitFor({timeout:3000});
log('✅ Calendário recorrente renderizado');
// overdue mode
await page.getByText(/Calendário de vencidos/).click();
await page.locator('.aging-row').waitFor({timeout:3000});
const vencKpi = await page.locator('.aging-card .v').first().innerText();
log('✅ Calendário de vencidos; total vencidos =', vencKpi);
// click a day with overdue
const odDay = page.locator('.cal-day.overdue-day').first();
if(await odDay.count()){ await odDay.click(); await page.waitForTimeout(200);
  const detail = await page.locator('.detail-card').count();
  log('   detalhe do dia vencido -> cards =', detail);
}

// Filters: set responsavel filter and check counts change
await page.getByRole('button',{name:'Dashboard',exact:true}).click();
await page.locator('.filterbar select').first().selectOption({index:1});
await page.waitForTimeout(300);
const kpiProc2 = await page.locator('.kpi .v').nth(1).innerText();
log('✅ filtro Analista aplicado; processos únicos =', kpiProc2, '(era', kpiProc+')');
// clear
await page.getByRole('button',{name:'Limpar filtros'}).click();
await page.waitForTimeout(200);
const kpiProc3 = await page.locator('.kpi .v').nth(1).innerText();
log('✅ limpar filtros; processos únicos =', kpiProc3);

log('\nERROS de console/página:', errors.length);
errors.slice(0,10).forEach(e=>log('  '+e));
await browser.close();
process.exit(errors.length? 1:0);
