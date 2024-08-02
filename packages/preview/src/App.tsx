import { Masonry } from "@hid/components";
import styles from "./App.module.scss";
import { useEffect, useRef, useState } from "react";
import "@hid/components/dist/style.css";
import { IHomeFeed } from "./types/types.ts";

function App() {
	const ref = useRef<HTMLDivElement>(null);

	const [data, setData] = useState<Array<IHomeFeed>>([]);

	useEffect(() => {
		fetch("/mock.json")
			.then((res) => res.json())
			.then((res) => {
				setData(res);
			})
			.catch((e) => {
				console.error(e);
			});
	}, []);

	return (
		<>
			<div className={styles.container} ref={ref}>
				{data.length !== 0 ? (
					<Masonry
						scrollContainer={ref}
						data={data.slice(0)}
						rowKey={"id"}
						gutter={20}
						columns={6}
						onReachBottom={() => {
							console.log("到达底部，加载更多");
						}}
						render={(item, width, x, y) => {
							return (
								<div
									className={styles.itemContainer}
									style={{
										width,
										transform: `translateX(${x}px) translateY(${y}px)`,
									}}
								>
									<img
										alt=""
										src={item.note_card.cover.url_default}
										style={{
											height:
												(width / item.note_card.cover.width) *
												item.note_card.cover.height,
										}}
									/>
									<div>{item.note_card.display_title}</div>
								</div>
							);
						}}
					/>
				) : null}
			</div>
		</>
	);
}

export default App;
