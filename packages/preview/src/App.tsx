import { Masonry } from "@hid/components";
import styles from "./App.module.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import "@hid/components/dist/style.css";
import { IHomeFeed } from "./types/types.ts";

function App() {
	const ref = useRef<HTMLDivElement>(null);

	const [data, setData] = useState<Array<IHomeFeed>>([]);

	const [time, setTime] = useState(1);

	useEffect(() => {
		fetch("/mock.json")
			.then((res) => res.json())
			.then((res) => {
				console.log("res", res);
				setData(res);
			})
			.catch((e) => {
				console.error(e);
			});
	}, []);

	const total = useMemo(() => {
		return 16 * time;
	}, [time]);

	// console.log("data", data.slice(0, total));

	return (
		<>
			<div className={styles.container} ref={ref}>
				{data.length !== 0 ? (
					<Masonry
						scrollContainer={ref}
						data={data.slice(0, Math.min(total, 50))}
						rowKey={"id"}
						gutter={20}
						columns={4}
						onReachBottom={() => {
							setTime(prev => prev + 1);
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
