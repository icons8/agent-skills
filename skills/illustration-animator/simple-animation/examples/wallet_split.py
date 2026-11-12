import sys; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts')); from lot import *
import cv2, numpy as np
P=load_paths('wallet.svg'); K=2
m=ink_mask((1500,1500),P[0][0],K)
# the top boundary of the wallet's top edge, measured on zoomed grids (edge bottom - its ~24 px width);
# on the left it runs through the notch where the first note's line meets the wallet's rounded corner
CUT=[(150,780),(290,645),(312,626),(332,610),(345,604),(400,606),(440,606),(480,604),(520,602),(560,597),(600,592),(640,592),
     (680,585),(720,578),(760,572),(800,569),(840,563),(880,563),(920,567),(960,567),(1000,568),(1040,568),(1080,567),
     (1120,571),(1160,581),(1200,604),(1300,640)]
yy,xx=np.mgrid[0:m.shape[0],0:m.shape[1]]/K
cut_y=np.interp(xx,[p[0] for p in CUT],[p[1] for p in CUT])
# along the straight part of the edge, follow the edge's own chalky shape instead of a ruled line: its lower
# boundary (clean - the wallet is empty below it) moved up by the edge's width
cy1=np.interp(np.arange(m.shape[1])/K,[p[0] for p in CUT],[p[1] for p in CUT])
X0,X1=int(322*K),int(1175*K); bot=[]
for X in range(X0,X1):
    y=int((cy1[X]+45)*K)
    while y>0 and not m[y,X]: y-=1
    bot.append(y/K)
from scipy.ndimage import median_filter, uniform_filter1d
bot=uniform_filter1d(median_filter(np.array(bot),size=9*K),size=7*K)
for i,X in enumerate(range(X0,X1)):
    cut_y[:,X]=bot[i]-25
# blend into the measured cut at both ends
cash=(m&(yy<cut_y)&(xx<1110))|(m&(yy<cut_y+3)&(xx>882)&(xx<1064))   # the coin overlaps the edge by 3 px: no hairline seam
wallet=m&~(m&(yy<cut_y)&(xx<1110))
# the cash runs on below the edge (hidden by the wallet's front), so an elastic overshoot or a tilt never shows
# a cut-off end: each line that crosses the edge is continued along its own direction; the coin straight down
EXT=110
ext=np.zeros(m.shape,np.uint8)
# seamless run-on: the last ~22 px of each crossing line (its own chalky ink, exact width) is stamped again and
# again along the line's direction; the coin's bottom slice is stamped straight down
def stamp(sel, d, step=4):
    ys,xs=np.nonzero(sel)
    for k in range(1, EXT//step+1):
        dx,dy=int(round(d[0]*k*step*K)),int(round(d[1]*k*step*K))
        ext[np.clip(ys+dy,0,m.shape[0]-1),np.clip(xs+dx,0,m.shape[1]-1)]=1
# each crossing line: follow its centre row by row just above the edge, fit x(y), carry it on below with its
# own measured width (horizontal runs, a little chalk jitter) - continuous with the drawn line
rng=np.random.default_rng(5)
for cx0 in (318,392):          # (the ∩'s leg is a tapered stroke end: left as drawn)
    pts=[]; cx=cx0*K
    ycut=int(np.interp(cx0,[p[0] for p in CUT],[p[1] for p in CUT])*K)
    ycut=int(cut_y[0,int(cx)]*K)
    for Y in range(ycut-2,ycut-90*K,-1):
        row=np.nonzero(cash[Y,int(cx-30*K):int(cx+30*K)])[0]
        if len(row)==0:
            if len(pts)==0 and Y>ycut-20*K: continue
            break
        # the run containing / nearest the current centre
        runs=np.split(row,np.nonzero(np.diff(row)>1)[0]+1)
        r=min(runs,key=lambda r: abs((r[0]+r[-1])/2+cx-30*K-cx))
        c=(r[0]+r[-1])/2+cx-30*K; pts.append((Y,c,len(r))); cx=c
    pts=np.array(pts)
    body=pts[pts[:,0]<pts[:,0].max()-24*K] if (pts[:,0]<pts[:,0].max()-24*K).sum()>10 else pts   # above the chalk taper at the edge
    A=np.polyfit(body[:,0],body[:,1],1); wd=np.median(body[:,2])
    ystart=int(pts[:,0].max())-30*K                                       # cover the taper with the full width
    for Y in range(ystart,ystart+EXT*K):
        c=np.polyval(A,Y); h=wd/2+rng.uniform(-0.4,0.4)*K
        ext[Y,int(c-h):int(c+h)+1]=1
    print('line',cx0,'slope',round(A[0],3),'width',wd/K)
# the coin: its hidden lower half, an ellipse continuing its sides below the edge
cyc=np.interp(970,[p[0] for p in CUT],[p[1] for p in CUT])
el=np.zeros(m.shape,np.uint8); cv2.ellipse(el,(int(973*K),int((cyc-12)*K)),(int(93*K),int(84*K)),0,0,360,1,-1)
ext|=(el>0)&(yy>cut_y+1)
cash=cash|((ext>0)&(yy>=cut_y-2))
n,lab,st,_=cv2.connectedComponentsWithStats(cash.astype(np.uint8))
for i in range(1,n):
    if st[i,cv2.CC_STAT_AREA]<400*K*K: cash[lab==i]=False          # no specks
xs_=np.arange(150,1501,5); cutc=np.array([[x,cut_y[0,min(int(x*K),m.shape[1]-1)]] for x in xs_])
np.savez_compressed('split.npz',cash=cash,wallet=wallet,cut=cutc)
vis=np.full(m.shape+(3,),255,np.uint8); vis[wallet]=(0,150,0); vis[cash]=(0,0,200)
cv2.imwrite('split.png',cv2.resize(vis[150*K:800*K,200*K:1300*K],(1100,650)))
