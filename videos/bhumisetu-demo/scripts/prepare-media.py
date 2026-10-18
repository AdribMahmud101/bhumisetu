"""Derive presentation clips from actual app recordings; keep a source-range ledger."""
from pathlib import Path
import json, subprocess

repo = Path(__file__).resolve().parents[3]
project = repo / 'videos/bhumisetu-demo'
assets = project / 'assets'
raw = repo / '.local/video/raw'
ledger = []

def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def clip(name, start, middle_start, middle_end, end, duration):
    # The only accelerated portion is the provider waiting interval.
    wait_target = duration - (middle_start-start) - (end-middle_end)
    assert wait_target > 0
    factor = wait_target/(middle_end-middle_start)
    filt = (
        f'[0:v]split=3[a][b][c];'
        f'[a]trim=start={start}:end={middle_start},setpts=PTS-STARTPTS[a1];'
        f'[b]trim=start={middle_start}:end={middle_end},setpts={factor}*(PTS-STARTPTS)[b1];'
        f'[c]trim=start={middle_end}:end={end},setpts=PTS-STARTPTS[c1];'
        '[a1][b1][c1]concat=n=3:v=1:a=0,fps=30,format=yuv420p[v]'
    )
    out=assets/f'{name}-live.mp4'
    run(['ffmpeg','-y','-i',str(raw/f'{name}.webm'),'-filter_complex',filt,'-map','[v]','-an','-t',str(duration),'-c:v','libx264','-crf','17','-preset','fast','-g','30','-keyint_min','30','-sc_threshold','0','-movflags','+faststart',str(out)])
    ledger.append({'asset':out.name,'source':f'.local/video/raw/{name}.webm','source_start':start,'wait_start':middle_start,'wait_end':middle_end,'source_end':end,'output_duration':duration,'wait_output_duration':round(wait_target,3),'waiting_edit_labeled':True})

ocr=json.loads((repo/'.local/video/ocr-events.json').read_text())
time=lambda items,key:next(e['time'] for e in items if e['name']==key)
clip('ocr',time(ocr,'upload-click')-1,time(ocr,'processing'),time(ocr,'actual-ocr-response'),time(ocr,'end-content'),18)
deed=json.loads((repo/'.local/video/deed-events.json').read_text())
clip('deed',0.8,2.6,time(deed,'actual-deed-extraction'),time(deed,'end-content'),13)
run(['ffmpeg','-y','-ss','1.3','-i',str(raw/'citizen.webm'),'-an','-vf','fps=30,tpad=stop_mode=clone:stop_duration=3,format=yuv420p','-t','13','-c:v','libx264','-crf','17','-preset','fast','-g','30','-keyint_min','30','-sc_threshold','0','-movflags','+faststart',str(assets/'citizen-live.mp4')])
ledger.append({'asset':'citizen-live.mp4','source':'.local/video/raw/citizen.webm','source_start':1.3,'output_duration':13,'edit':'final frame holds; interactions remain at recorded speed'})

for source,name,crop in [
    ('ocr-editable.png','ocr-fields.png','1260:620:810:900'),
    ('source-review.png','review-editor.png','1570:1270:860:260'),
    ('source-review.png','review-fields.png','1200:840:1460:680'),
    ('deed-comparison-detail.png','deed-key-fields.png','1680:700:0:0'),
]:
    run(['ffmpeg','-y','-i',str(assets/source),'-vf','crop='+crop,'-frames:v','1',str(assets/name)])
    ledger.append({'asset':name,'source':source,'crop':crop,'edit':'crop only; no app values changed'})
(project/'SOURCE_RANGES.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2))
print('Prepared actual app clips and source-range ledger')
