# 토익 단어장

토익 단어를 카드, 학습, 시험, 매칭 게임으로 외우는 개인용 웹앱입니다.

- 데이터는 **사용하는 브라우저에만** 저장됩니다. 기기를 바꿀 때는 홈 화면의 "백업 내려받기 → 백업 불러오기"를 쓰세요.
- 단어 목록은 세트 편집의 "목록 붙여 넣기"로 엑셀·메모장에서 한 번에 가져올 수 있습니다.
- 샘플 세트는 이 앱을 위해 고른 단어이며 공식 토익 단어 목록이 아닙니다.

## 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 학습 로직 단위 테스트
npm run build    # 정적 사이트를 out/에 생성
```

`main`에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 테스트 후 GitHub Pages에 배포합니다.
