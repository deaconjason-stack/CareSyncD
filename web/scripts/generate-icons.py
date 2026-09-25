#!/usr/bin/env python3
import struct,zlib,binascii,pathlib

def png(size,path):
    bg=(7,19,31,255); cyan=(58,224,208,255); white=(245,250,252,255)
    rows=[]
    for y in range(size):
        row=bytearray()
        for x in range(size):
            r,g,b,a=bg
            # rounded-ish cyan frame
            margin=size//8; thick=max(2,size//40)
            if margin<=x<size-margin and margin<=y<size-margin and (x<margin+thick or x>=size-margin-thick or y<margin+thick or y>=size-margin-thick): r,g,b,a=cyan
            # stylized hospital pulse line
            cy=size//2
            pts=[(size*.20,cy),(size*.36,cy),(size*.43,cy-size*.13),(size*.50,cy+size*.18),(size*.58,cy-size*.22),(size*.66,cy),(size*.80,cy)]
            # distance to polyline
            for (x1,y1),(x2,y2) in zip(pts,pts[1:]):
                vx=x2-x1; vy=y2-y1; wx=x-x1; wy=y-y1; den=vx*vx+vy*vy
                t=max(0,min(1,(wx*vx+wy*vy)/den)) if den else 0
                dx=x-(x1+t*vx); dy=y-(y1+t*vy)
                if dx*dx+dy*dy <= (max(2,size//70))**2: r,g,b,a=white; break
            row.extend((r,g,b,a))
        rows.append(b'\x00'+bytes(row))
    raw=b''.join(rows)
    def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',binascii.crc32(t+d)&0xffffffff)
    data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
    pathlib.Path(path).write_bytes(data)

out=pathlib.Path('public/icons');out.mkdir(parents=True,exist_ok=True)
for size in (192,512): png(size,out/f'icon-{size}.png')
